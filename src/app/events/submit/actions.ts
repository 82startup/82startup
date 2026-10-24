"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { normalizeEventUrl } from "@/lib/external/url";
import { createClient } from "@/lib/supabase/server";

export type RequestState = { sent?: boolean; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E = copy.eventRequests.errors;

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login?next=/events/submit");
  return supabase;
}

// The server only stores the link; it does not open the page. An admin reads the page when reviewing.
export async function submitEventRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const supabase = await signedIn();

  const checked = normalizeEventUrl(String(formData.get("link") ?? ""));
  if (!checked.ok) return { error: E.link };
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 300) return { error: E.noteLong };

  const { error } = await supabase.rpc("submit_event_request", { p_url: checked.url, p_host: checked.host, p_note: note });
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
  return { sent: true };
}

export async function withdrawEventRequest(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const supabase = await signedIn();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: E.save };
  const { error } = await supabase.rpc("withdraw_event_request", { p_id: id });
  if (error) return { error: E.save };
  revalidatePath("/events/submit");
  return {};
}
