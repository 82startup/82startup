"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReadState, SaveState } from "@/app/admin/events/external-actions";
import { copy } from "@/lib/copy";
import { fetchEventPage } from "@/lib/external/fetch";
import { parseExternalForm, toPreview, type Preview } from "@/lib/external/form";
import { parseEventPage } from "@/lib/external/parse";
import { normalizeEventUrl } from "@/lib/external/url";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E = copy.eventRequests.errors;
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login?next=/events/submit");
  return supabase;
}

// Step 1: read the member's link into details for them to check (the same guarded fetch the admin uses). Nothing is saved.
export async function readEventRequestLink(_prev: ReadState, formData: FormData): Promise<ReadState> {
  const supabase = await signedIn();

  const checked = normalizeEventUrl(text(formData, "link"));
  if (!checked.ok) return { error: E.link };

  const { data: found } = await supabase.from("events").select("id").eq("luma_url", checked.url).limit(1);
  if (found && found.length > 0) return { error: E.onSite };

  const page = await fetchEventPage(checked.url);
  if (!page.ok) return { error: copy.externalAdmin.errors.read[page.reason], fillByHand: { url: checked.url, host: checked.host } };
  const parsed = parseEventPage(page.html);
  if (!parsed.ok) return { error: copy.externalAdmin.errors.notEvent, fillByHand: { url: checked.url, host: checked.host } };
  return { preview: toPreview(parsed.event, checked.url, checked.host) };
}

// Step 2: send the request with the details the member checked. The admin reviews exactly these details.
export async function submitEventRequest(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await signedIn();

  const parsed = parseExternalForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const v = parsed.value;
  const note = text(formData, "note");
  if ([...note].length > 300) return { error: E.noteLong };

  const details: Preview = {
    url: v.url, host: v.host, title: v.title, description: v.description, timezone: v.timezone,
    start: text(formData, "start"), end: text(formData, "end"), locationType: v.locationType,
    venueName: v.venueName ?? "", venueCity: v.venueCity ?? "", venueAddress: v.venueAddress ?? "", coverUrl: v.coverUrl ?? "",
  };
  const { error } = await supabase.rpc("submit_event_request", { p_url: v.url, p_host: v.host, p_note: note, p_details: details });
  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("already on the site")) return { error: E.onSite };
    if (message.includes("already requested")) return { error: E.requested };
    if (message.includes("too many waiting")) return { error: E.tooManyWaiting };
    if (message.includes("too many today")) return { error: E.tooManyToday };
    if (message.includes("profile not complete")) return { error: E.profile };
    return { error: E.save };
  }

  revalidatePath("/events/submit");
  return { saved: true };
}

export async function withdrawEventRequest(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const supabase = await signedIn();
  const id = text(formData, "id");
  if (!UUID.test(id)) return { error: E.save };
  const { error } = await supabase.rpc("withdraw_event_request", { p_id: id });
  if (error) return { error: E.save };
  revalidatePath("/events/submit");
  return {};
}
