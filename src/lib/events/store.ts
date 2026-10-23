import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventStore } from "@/lib/luma/sync";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function createEventStore(db: SupabaseClient): EventStore {
  const synced = () => ({
    removed_from_luma: false,
    luma_synced_at: new Date().toISOString(),
    luma_sync_status: "ok",
    luma_sync_error: null,
  });

  return {
    async listStored() {
      const { data, error } = await db.from("events").select("luma_event_id, start_at, end_at, removed_from_luma");
      fail(error);
      return data ?? [];
    },
    async insert(row) {
      fail((await db.from("events").insert({ ...row, ...synced() })).error);
    },
    async update(lumaId, fields) {
      fail((await db.from("events").update({ ...fields, ...synced() }).eq("luma_event_id", lumaId)).error);
    },
    async markError(lumaId, message) {
      fail(
        (await db.from("events").update({ luma_sync_status: "error", luma_sync_error: message.slice(0, 500) }).eq("luma_event_id", lumaId))
          .error,
      );
    },
    async markRemoved(lumaIds) {
      fail((await db.from("events").update({ removed_from_luma: true }).in("luma_event_id", lumaIds)).error);
    },
    async syncAttendees(lumaEventId, emails) {
      const { data, error } = await db.rpc("sync_luma_attendees", { p_luma_event_id: lumaEventId, p_emails: emails });
      fail(error);
      return { matched: Number(data?.[0]?.matched ?? 0) };
    },
  };
}
