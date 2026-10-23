import type { LumaReader } from "./client";
import { makeSlug, mapEvent, type EventFields } from "./map";

export type StoredEvent = {
  luma_event_id: string;
  start_at: string;
  end_at: string | null;
  removed_from_luma: boolean;
};

export type EventWrite = EventFields & { description?: string };

export interface EventStore {
  listStored(): Promise<StoredEvent[]>;
  insert(row: EventFields & { slug: string; description: string }): Promise<void>;
  // Also sets removed_from_luma = false and the sync columns. Never touches slug, hidden or status.
  update(lumaId: string, fields: EventWrite): Promise<void>;
  markError(lumaId: string, message: string): Promise<void>;
  markRemoved(lumaIds: string[]): Promise<void>;
}

export type SyncResult = { created: number; updated: number; removed: number; errors: number };

function hasEnded(fields: Pick<EventFields, "start_at" | "end_at">, now: Date): boolean {
  return new Date(fields.end_at ?? fields.start_at) < now;
}

export async function runSync(luma: LumaReader, store: EventStore, now: Date = new Date()): Promise<SyncResult> {
  // 1. Read everything first. If either read fails, nothing has been written yet.
  const listed = await luma.listCalendarEvents();
  const stored = await store.listStored();
  const storedById = new Map(stored.map((row) => [row.luma_event_id, row]));

  const result: SyncResult = { created: 0, updated: 0, removed: 0, errors: 0 };
  const seen = new Set<string>();

  // 2. Insert or update each public event.
  for (const entry of listed) {
    const fields = mapEvent(entry);
    if (!fields) continue;
    seen.add(fields.luma_event_id);
    const existing = storedById.get(fields.luma_event_id);

    try {
      let description: string | undefined;
      if (!existing || !hasEnded(fields, now)) {
        description = (await luma.getEvent(fields.luma_event_id)).description ?? "";
      }

      if (existing) {
        await store.update(fields.luma_event_id, description === undefined ? fields : { ...fields, description });
        result.updated++;
      } else {
        await store.insert({ ...fields, slug: makeSlug(fields.title, fields.luma_event_id), description: description ?? "" });
        result.created++;
      }
    } catch (error) {
      result.errors++;
      if (existing) {
        const message = error instanceof Error ? error.message : "unknown error";
        await store.markError(fields.luma_event_id, message).catch(() => {});
      }
    }
  }

  // 3. Only now that the whole listing was read: events no longer there (or no longer public) are marked removed.
  const gone = stored.filter((row) => !row.removed_from_luma && !seen.has(row.luma_event_id)).map((row) => row.luma_event_id);
  if (gone.length > 0) {
    await store.markRemoved(gone);
    result.removed = gone.length;
  }

  return result;
}
