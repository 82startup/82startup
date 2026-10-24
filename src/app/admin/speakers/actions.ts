"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";
import { isSitePath } from "@/lib/site/images";
import { moveInOrder } from "@/lib/site/order";
import { makeSpeakerSlug } from "@/lib/site/slug";
import { removeSiteImage, storeSiteImage } from "@/lib/site/upload";
import { parseSpeakerForm, type SpeakerErrors } from "@/lib/site/validate";

export type SpeakerState = { saved?: boolean; error?: string; errors?: SpeakerErrors & { photo?: string } };

const LOGIN = "/login?next=/admin/speakers";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  updateTag("speakers");
  revalidatePath("/admin/speakers");
  revalidatePath("/speakers");
  revalidatePath("/speakers/[slug]", "page");
  revalidatePath("/");
}

async function admin() {
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect(LOGIN);
  return check.status === "admin" ? supabase : null;
}

const idOf = (formData: FormData) => {
  const id = String(formData.get("id") ?? "");
  return UUID.test(id) ? id : null;
};

// Adds a speaker (no id) or changes one (with an id). The page address (slug) is made from the name when the speaker is added and
// never changes afterwards, so links to the speaker keep working.
export async function saveSpeaker(_prev: SpeakerState, formData: FormData): Promise<SpeakerState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };

  const parsed = parseSpeakerForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  const id = idOf(formData);
  if (String(formData.get("id") ?? "") !== "" && !id) return { error: copy.sponsorsAdmin.errors.save };

  let oldPhoto: string | null = null;
  if (id) {
    const { data: existing } = await supabase.from("speakers").select("photo_path").eq("id", id).maybeSingle();
    if (!existing) return { error: copy.sponsorsAdmin.errors.save };
    oldPhoto = existing.photo_path;
  }

  let photoPath: string | null | undefined;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const stored = await storeSiteImage(supabase, "speakers", file);
    if (!stored.ok) return { errors: { photo: copy.sponsorsAdmin.errors.picture[stored.reason] } };
    photoPath = stored.path;
  } else if (formData.get("remove_photo") === "on") {
    photoPath = null;
  }

  const { event_ids: eventIds, ...fields } = parsed.value;
  const values = { ...fields, ...(photoPath === undefined ? {} : { photo_path: photoPath }), updated_at: new Date().toISOString() };
  let savedId: string | null = id;
  if (id) {
    const { data, error } = await supabase.from("speakers").update(values).eq("id", id).select("id").maybeSingle();
    if (error || !data) savedId = null;
  } else {
    const { data: rows } = await supabase.from("speakers").select("slug, sort_order");
    const taken = new Set((rows ?? []).map((row) => row.slug as string));
    const last = Math.max(0, ...(rows ?? []).map((row) => Number(row.sort_order) || 0));
    const { data, error } = await supabase
      .from("speakers")
      .insert({ ...values, slug: makeSpeakerSlug(parsed.value.name, taken), sort_order: last + 1 })
      .select("id")
      .single();
    savedId = error || !data ? null : (data as { id: string }).id;
  }
  if (!savedId) {
    if (photoPath) await removeSiteImage(supabase, photoPath);
    return { error: copy.sponsorsAdmin.errors.save };
  }

  // The events the speaker speaks at are replaced all at once (an empty choice clears them).
  const { error: linkError } = await supabase.rpc("admin_set_speaker_events", { p_speaker: savedId, p_events: eventIds });
  if (linkError) return { error: copy.sponsorsAdmin.errors.save };

  if (oldPhoto && photoPath !== undefined && oldPhoto !== photoPath) await removeSiteImage(supabase, oldPhoto);
  refresh();
  return { saved: true };
}

export async function deleteSpeaker(_prev: SpeakerState, formData: FormData): Promise<SpeakerState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };
  const id = idOf(formData);
  if (!id) return { error: copy.sponsorsAdmin.errors.save };

  const { data: existing } = await supabase.from("speakers").select("photo_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("speakers").delete().eq("id", id);
  if (error) return { error: copy.sponsorsAdmin.errors.save };
  if (existing?.photo_path && isSitePath("speakers", existing.photo_path)) await removeSiteImage(supabase, existing.photo_path);
  refresh();
  return {};
}

export async function setSpeakerVisible(_prev: SpeakerState, formData: FormData): Promise<SpeakerState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };
  const id = idOf(formData);
  const value = String(formData.get("value") ?? "");
  if (!id || (value !== "true" && value !== "false")) return { error: copy.sponsorsAdmin.errors.save };

  const { data, error } = await supabase.from("speakers").update({ visible: value === "true", updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: copy.sponsorsAdmin.errors.save };
  refresh();
  return {};
}

export async function moveSpeaker(_prev: SpeakerState, formData: FormData): Promise<SpeakerState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };
  const id = idOf(formData);
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return { error: copy.sponsorsAdmin.errors.save };

  const { data, error } = await supabase.from("speakers").select("id, sort_order").order("sort_order").order("name");
  if (error || !data) return { error: copy.sponsorsAdmin.errors.save };
  for (const change of moveInOrder(data, id, direction)) {
    const { error: updateError } = await supabase.from("speakers").update({ sort_order: change.sort_order }).eq("id", change.id);
    if (updateError) return { error: copy.sponsorsAdmin.errors.save };
  }
  refresh();
  return {};
}
