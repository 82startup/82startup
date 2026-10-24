"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";
import { fetchEventPage } from "@/lib/external/fetch";
import { makeExternalSlug, parseExternalForm, toPreview, type ExternalErrors, type Preview } from "@/lib/external/form";
import { parseEventPage } from "@/lib/external/parse";
import { normalizeEventUrl } from "@/lib/external/url";

export type ReadState = { preview?: Preview; error?: string; fillByHand?: { url: string; host: string }; id?: string };
export type SaveState = { saved?: boolean; error?: string; errors?: ExternalErrors };

const LOGIN = "/login?next=/admin/events";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E = copy.externalAdmin.errors;

async function admin() {
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect(LOGIN);
  return check.status === "admin" ? supabase : null;
}

function refresh() {
  updateTag("events");
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}

type Db = NonNullable<Awaited<ReturnType<typeof admin>>>;

// Fetches the page and turns it into a preview for the admin to check. Nothing is saved.
async function readPage(url: string, host: string): Promise<ReadState> {
  const page = await fetchEventPage(url);
  if (!page.ok) return { error: E.read[page.reason], fillByHand: { url, host } };
  const parsed = parseEventPage(page.html);
  if (!parsed.ok) return { error: E.notEvent, fillByHand: { url, host } };
  return { preview: toPreview(parsed.event, url, host) };
}

// Is this address already an event on the site (ours from Luma, or added before)?
async function existing(supabase: Db, url: string): Promise<"luma" | "external" | null> {
  const { data } = await supabase.from("events").select("id, source").eq("luma_url", url).limit(1);
  const row = (data as { source: string }[] | null)?.[0];
  return row ? (row.source === "external" ? "external" : "luma") : null;
}

export async function readEventLink(_prev: ReadState, formData: FormData): Promise<ReadState> {
  const supabase = await admin();
  if (!supabase) return { error: E.forbidden };

  const checked = normalizeEventUrl(String(formData.get("link") ?? ""));
  if (!checked.ok) return { error: E.link };

  const found = await existing(supabase, checked.url);
  if (found === "external") return { error: E.duplicate };
  if (found === "luma") return { error: E.ownCalendar };
  return readPage(checked.url, checked.host);
}

// Reads the stored link of an external event again, for the admin to check and save over it.
export async function refreshFromLink(_prev: ReadState, formData: FormData): Promise<ReadState> {
  const supabase = await admin();
  if (!supabase) return { error: E.forbidden };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: E.save };

  const { data } = await supabase.from("events").select("external_url").eq("id", id).eq("source", "external").maybeSingle();
  const checked = normalizeEventUrl(String((data as { external_url?: string } | null)?.external_url ?? ""));
  if (!checked.ok) return { error: E.save };
  return { ...(await readPage(checked.url, checked.host)), id };
}

// Adds an external event (no id) or changes one (with its id) through the admin function. The page address is made once, when it is added.
export async function saveExternalEvent(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await admin();
  if (!supabase) return { error: E.forbidden };

  const parsed = parseExternalForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const v = parsed.value;

  const rawId = String(formData.get("id") ?? "");
  if (rawId !== "" && !UUID.test(rawId)) return { error: E.save };
  const id = rawId || null;

  if (!id) {
    const found = await existing(supabase, v.url);
    if (found === "luma") return { error: E.ownCalendar };
    if (found === "external") return { error: E.duplicate };
  }

  const { error } = await supabase.rpc("admin_save_external_event", {
    p_id: id,
    p_slug: id ? null : makeExternalSlug(v.title, randomBytes(3).toString("hex")),
    p_title: v.title,
    p_description: v.description,
    p_start_at: v.startUtc,
    p_end_at: v.endUtc,
    p_timezone: v.timezone,
    p_location_type: v.locationType,
    p_venue_name: v.venueName,
    p_venue_city: v.venueCity,
    p_venue_address: v.venueAddress,
    p_cover_url: v.coverUrl,
    p_external_url: v.url,
    p_external_host: v.host,
    p_hidden: v.hidden,
  });
  if (error) return { error: error.code === "23505" ? E.duplicate : E.save };

  refresh();
  return { saved: true };
}

export async function deleteExternalEvent(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await admin();
  if (!supabase) return { error: E.forbidden };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: E.save };

  const { error } = await supabase.rpc("admin_delete_external_event", { p_id: id });
  if (error) return { error: E.save };
  refresh();
  return {};
}
