"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";
import { isSitePath } from "@/lib/site/images";
import { moveInOrder } from "@/lib/site/order";
import { removeSiteImage, storeSiteImage } from "@/lib/site/upload";
import { parseContactLink, parseSponsorForm, type SponsorErrors } from "@/lib/site/validate";

export type SponsorState = { saved?: boolean; error?: string; errors?: SponsorErrors & { logo?: string } };

const LOGIN = "/login?next=/admin/sponsors";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// updateTag expires the public pages' data at once, so a change shows on the next visit.
function refresh() {
  updateTag("sponsors");
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
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

// Adds a sponsor (no id) or changes one (with an id). A new logo replaces the old one; "remove_logo" removes it.
export async function saveSponsor(_prev: SponsorState, formData: FormData): Promise<SponsorState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };

  const parsed = parseSponsorForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  const id = idOf(formData);
  if (String(formData.get("id") ?? "") !== "" && !id) return { error: copy.sponsorsAdmin.errors.save };

  let oldLogo: string | null = null;
  if (id) {
    const { data: existing } = await supabase.from("sponsors").select("logo_path").eq("id", id).maybeSingle();
    if (!existing) return { error: copy.sponsorsAdmin.errors.save };
    oldLogo = existing.logo_path;
  }

  let logoPath: string | null | undefined; // undefined = leave as it is
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    const stored = await storeSiteImage(supabase, "sponsors", file);
    if (!stored.ok) return { errors: { logo: copy.sponsorsAdmin.errors.picture[stored.reason] } };
    logoPath = stored.path;
  } else if (formData.get("remove_logo") === "on") {
    logoPath = null;
  }

  const values = { ...parsed.value, ...(logoPath === undefined ? {} : { logo_path: logoPath }), updated_at: new Date().toISOString() };
  let failed: boolean;
  if (id) {
    const { data, error } = await supabase.from("sponsors").update(values).eq("id", id).select("id").maybeSingle();
    failed = Boolean(error) || !data;
  } else {
    const { data: last } = await supabase.from("sponsors").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("sponsors").insert({ ...values, sort_order: (last?.sort_order ?? 0) + 1 });
    failed = Boolean(error);
  }
  if (failed) {
    // The row was not saved, so a picture that was just uploaded would be orphaned.
    if (logoPath) await removeSiteImage(supabase, logoPath);
    return { error: copy.sponsorsAdmin.errors.save };
  }

  if (oldLogo && logoPath !== undefined && oldLogo !== logoPath) await removeSiteImage(supabase, oldLogo);
  refresh();
  return { saved: true };
}

export async function deleteSponsor(_prev: SponsorState, formData: FormData): Promise<SponsorState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };
  const id = idOf(formData);
  if (!id) return { error: copy.sponsorsAdmin.errors.save };

  const { data: existing } = await supabase.from("sponsors").select("logo_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("sponsors").delete().eq("id", id);
  if (error) return { error: copy.sponsorsAdmin.errors.save };
  if (existing?.logo_path && isSitePath("sponsors", existing.logo_path)) await removeSiteImage(supabase, existing.logo_path);
  refresh();
  return {};
}

export async function setSponsorVisible(_prev: SponsorState, formData: FormData): Promise<SponsorState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };
  const id = idOf(formData);
  const value = String(formData.get("value") ?? "");
  if (!id || (value !== "true" && value !== "false")) return { error: copy.sponsorsAdmin.errors.save };

  const { data, error } = await supabase.from("sponsors").update({ visible: value === "true", updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: copy.sponsorsAdmin.errors.save };
  refresh();
  return {};
}

// Moves a sponsor a place up or down among all sponsors (the public page groups them by tier, keeping this order within a tier).
export async function moveSponsor(_prev: SponsorState, formData: FormData): Promise<SponsorState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };
  const id = idOf(formData);
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return { error: copy.sponsorsAdmin.errors.save };

  const { data, error } = await supabase.from("sponsors").select("id, sort_order, tier").order("tier").order("sort_order").order("name");
  if (error || !data) return { error: copy.sponsorsAdmin.errors.save };
  const target = data.find((row) => row.id === id);
  if (!target) return { error: copy.sponsorsAdmin.errors.save };

  // Only entries of the same tier trade places, since the public page shows each tier on its own.
  const sameTier = data.filter((row) => row.tier === target.tier);
  for (const change of moveInOrder(sameTier, id, direction)) {
    const { error: updateError } = await supabase.from("sponsors").update({ sort_order: change.sort_order }).eq("id", change.id);
    if (updateError) return { error: copy.sponsorsAdmin.errors.save };
  }
  refresh();
  return {};
}

export async function saveContactLink(_prev: SponsorState, formData: FormData): Promise<SponsorState> {
  const supabase = await admin();
  if (!supabase) return { error: copy.sponsorsAdmin.errors.forbidden };
  const parsed = parseContactLink(String(formData.get("contact") ?? ""));
  if (!parsed.ok) return { error: copy.sponsorsAdmin.errors.contact };

  const { error } = parsed.value === null
    ? await supabase.from("site_settings").delete().eq("key", "sponsor_contact_url")
    : await supabase.from("site_settings").upsert({ key: "sponsor_contact_url", value: parsed.value, updated_at: new Date().toISOString() });
  if (error) return { error: copy.sponsorsAdmin.errors.save };
  refresh();
  return { saved: true };
}
