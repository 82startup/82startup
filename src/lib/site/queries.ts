import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Speaker, Sponsor } from "./types";

// Public data, read with the publishable key and no cookies so it can be cached for everyone. The rules already limit it to visible rows.
function anonClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// A speaker row with its embedded links, as a Speaker with the list of event ids.
export function toSpeaker(row: Record<string, unknown>): Speaker {
  const { speaker_events, ...rest } = row as Record<string, unknown> & { speaker_events?: { event_id: string }[] };
  return { ...(rest as Omit<Speaker, "event_ids">), event_ids: (speaker_events ?? []).map((link) => link.event_id) };
}

export async function getSponsors(): Promise<Sponsor[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("sponsors");
  const { data, error } = await anonClient().from("sponsors").select("*").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Sponsor[];
}

export async function getSponsorContact(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("sponsors");
  const { data, error } = await anonClient().from("site_settings").select("value").eq("key", "sponsor_contact_url").maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

export async function getSpeakers(): Promise<Speaker[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("speakers");
  const { data, error } = await anonClient().from("speakers").select("*, speaker_events(event_id)").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSpeaker);
}

export async function getSpeaker(slug: string): Promise<Speaker | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("speakers");
  const { data, error } = await anonClient().from("speakers").select("*, speaker_events(event_id)").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSpeaker(data) : null;
}
