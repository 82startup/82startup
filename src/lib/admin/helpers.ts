export type AdminEvent = {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  status: "published" | "cancelled";
  hidden: boolean;
  featured: boolean;
  removed_from_luma: boolean;
  luma_synced_at: string | null;
  luma_sync_status: "ok" | "error" | null;
  luma_sync_error: string | null;
  source: "luma" | "external";
  external_url: string | null;
  external_host: string | null;
  location_type: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_address: string | null;
  cover_url: string | null;
  description: string;
};

export type EventFlag = "hidden" | "removed" | "sync-error";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSwitch(formData: FormData): { id: string; value: boolean } | null {
  const id = String(formData.get("id") ?? "");
  const value = String(formData.get("value") ?? "");
  if (!UUID.test(id) || (value !== "true" && value !== "false")) return null;
  return { id, value: value === "true" };
}

export function eventFlags(e: Pick<AdminEvent, "hidden" | "removed_from_luma" | "luma_sync_status">): EventFlag[] {
  const flags: EventFlag[] = [];
  if (e.hidden) flags.push("hidden");
  if (e.removed_from_luma) flags.push("removed");
  if (e.luma_sync_status === "error") flags.push("sync-error");
  return flags;
}

export function lastSyncedAt(events: Pick<AdminEvent, "luma_synced_at">[]): string | null {
  const times = events.map((e) => e.luma_synced_at).filter((t): t is string => Boolean(t));
  return times.length === 0 ? null : times.reduce((a, b) => (a > b ? a : b));
}
