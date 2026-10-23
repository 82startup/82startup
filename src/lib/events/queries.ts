import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseEnv } from "@/lib/supabase/env";
import type { PublicEvent } from "./types";

const COLUMNS =
  "slug, title, description, start_at, end_at, timezone, location_type, venue_name, venue_city, venue_address, cover_url, luma_url, featured";

// Public data, read with the publishable key and no cookies so the result can be cached for everyone.
// Row-level security already limits this to published, visible events.
function anonClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getVisibleEvents(): Promise<PublicEvent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const { data, error } = await anonClient().from("events").select(COLUMNS);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEvent(slug: string): Promise<PublicEvent | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const { data, error } = await anonClient().from("events").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
