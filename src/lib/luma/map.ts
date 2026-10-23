import type { LumaCalendarEvent } from "./types";

export type EventFields = {
  luma_event_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  location_type: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_address: string | null;
  cover_url: string | null;
  luma_url: string;
};

const HTTPS_URL = /^https:\/\/\S+$/;

function toIso(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Returns null for an event we must not import (not on Luma, not public, or unusable).
export function mapEvent(e: LumaCalendarEvent): EventFields | null {
  if (e.platform !== "luma") return null;
  if (e.visibility !== "public") return null;
  if (!e.id || !e.name?.trim() || !e.timezone) return null;
  if (!HTTPS_URL.test(e.url ?? "")) return null;

  const start = toIso(e.start_at);
  if (!start) return null;

  const guestsOnly = e.location_visibility === "guests-only";
  const geo = e.geo_address_json ?? null;

  return {
    luma_event_id: e.id,
    title: e.name.trim(),
    start_at: start,
    end_at: toIso(e.end_at),
    timezone: e.timezone,
    location_type: e.location_type ?? "unknown",
    venue_name: guestsOnly ? null : geo?.address || null,
    venue_city: geo?.city || null,
    venue_address: guestsOnly ? null : geo?.full_address || null,
    cover_url: e.cover_url && HTTPS_URL.test(e.cover_url) ? e.cover_url : null,
    luma_url: e.url,
  };
}

export function makeSlug(title: string, lumaId: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/, "") || "event";
  const suffix = lumaId.replace(/^evt-/, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}
