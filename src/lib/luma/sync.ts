import type { LumaReader } from "./client";
import { makeSlug, mapEvent, type EventFields } from "./map";

export type StoredEvent = {
  luma_event_id: string;
  start_at: string;
  end_at: string | null;
  removed_from_luma: boolean;
};

export type EventWrite = EventFields & { description?: string; description_md?: string; luma_approved_count?: number };

export interface EventStore {
  listStored(): Promise<StoredEvent[]>;
  insert(row: EventFields & { slug: string; description: string; description_md?: string; luma_approved_count?: number }): Promise<void>;
  // Also sets removed_from_luma = false and the sync columns. Never touches slug, hidden or status.
  update(lumaId: string, fields: EventWrite): Promise<void>;
  markError(lumaId: string, message: string): Promise<void>;
  markRemoved(lumaIds: string[]): Promise<void>;
  // Matches the approved guests' emails to members and keeps only the member link. Members not listed are cancelled,
  // so it must only be called with a complete list.
  syncAttendees(lumaEventId: string, emails: string[]): Promise<{ matched: number }>;
}

// Luma's formatted description is cut here (in whole characters) so one huge description cannot bloat a row.
const MAX_DESCRIPTION_MD = 20_000;

export type SyncResult = { created: number; updated: number; removed: number; errors: number; attendees: number };

function hasEnded(fields: Pick<EventFields, "start_at" | "end_at">, now: Date): boolean {
  return new Date(fields.end_at ?? fields.start_at) < now;
}

export async function runSync(luma: LumaReader, store: EventStore, now: Date = new Date()): Promise<SyncResult> {
  // 1. Read everything first. If either read fails, nothing has been written yet.
  const listed = await luma.listCalendarEvents();
  const stored = await store.listStored();
  const storedById = new Map(stored.map((row) => [row.luma_event_id, row]));

  const result: SyncResult = { created: 0, updated: 0, removed: 0, errors: 0, attendees: 0 };
  const seen = new Set<string>();

  // 2. Insert or update each public event.
  for (const entry of listed) {
    const fields = mapEvent(entry);
    if (!fields) continue;
    seen.add(fields.luma_event_id);
    const existing = storedById.get(fields.luma_event_id);
    const ended = hasEnded(fields, now);

    let written = false;
    try {
      let extra: { description?: string; description_md?: string; luma_approved_count?: number } = {};
      if (!existing || !ended) {
        const detail = await luma.getEvent(fields.luma_event_id);
        extra = {
          description: detail.description ?? "",
          description_md: [...(detail.description_md ?? "")].slice(0, MAX_DESCRIPTION_MD).join(""),
        };
        const approved = detail.guest_counts?.approved?.guests;
        if (typeof approved === "number") extra.luma_approved_count = approved;
      }

      if (existing) {
        await store.update(fields.luma_event_id, { ...fields, ...extra });
        result.updated++;
      } else {
        await store.insert({ ...fields, ...extra, slug: makeSlug(fields.title, fields.luma_event_id), description: extra.description ?? "" });
        result.created++;
      }
      written = true;
    } catch (error) {
      result.errors++;
      if (existing) {
        const message = error instanceof Error ? error.message : "unknown error";
        await store.markError(fields.luma_event_id, message).catch(() => {});
      }
    }

    // 3. Attendees, for events that have not ended and were written. A failure here never touches the attendees and
    // never records the underlying text (it could hold an email).
    if (!written || ended) continue;
    try {
      const emails = await luma.listApprovedGuestEmails(fields.luma_event_id);
      const { matched } = await store.syncAttendees(fields.luma_event_id, emails);
      result.attendees += matched;
    } catch {
      result.errors++;
      await store.markError(fields.luma_event_id, "guest list: could not read or match the attendees").catch(() => {});
    }
  }

  // 4. Only now that the whole listing was read: events no longer there (or no longer public) are marked removed.
  const gone = stored.filter((row) => !row.removed_from_luma && !seen.has(row.luma_event_id)).map((row) => row.luma_event_id);
  if (gone.length > 0) {
    await store.markRemoved(gone);
    result.removed = gone.length;
  }

  return result;
}
