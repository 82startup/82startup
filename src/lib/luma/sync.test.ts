import { describe, expect, it } from "vitest";
import type { LumaReader } from "./client";
import { runSync, type EventStore, type StoredEvent } from "./sync";
import type { LumaCalendarEvent, LumaEventDetail } from "./types";

const NOW = new Date("2026-11-01T00:00:00.000Z");

function lumaEvent(id: string, over: Partial<LumaCalendarEvent> = {}): LumaCalendarEvent {
  return {
    platform: "luma",
    id,
    name: `Event ${id}`,
    start_at: "2026-12-01T18:00:00.000Z",
    end_at: "2026-12-01T20:00:00.000Z",
    timezone: "UTC",
    url: `https://luma.com/${id}`,
    visibility: "public",
    location_type: "offline",
    ...over,
  };
}

function fakeLuma(events: LumaCalendarEvent[], opts: { listError?: Error; detailErrors?: string[] } = {}) {
  const detailCalls: string[] = [];
  const reader: LumaReader = {
    async listCalendarEvents() {
      if (opts.listError) throw opts.listError;
      return events;
    },
    async getEvent(id): Promise<LumaEventDetail> {
      detailCalls.push(id);
      if (opts.detailErrors?.includes(id)) throw new Error(`detail failed for ${id}`);
      return { ...lumaEvent(id), description: `About ${id}` };
    },
  };
  return { reader, detailCalls };
}

function fakeStore(stored: StoredEvent[] = []) {
  const log = {
    inserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<{ id: string; fields: Record<string, unknown> }>,
    errors: [] as Array<{ id: string; message: string }>,
    removed: [] as string[][],
    listed: 0,
  };
  const store: EventStore = {
    async listStored() {
      log.listed++;
      return stored;
    },
    async insert(row) {
      log.inserts.push(row);
    },
    async update(id, fields) {
      log.updates.push({ id, fields });
    },
    async markError(id, message) {
      log.errors.push({ id, message });
    },
    async markRemoved(ids) {
      log.removed.push(ids);
    },
  };
  return { store, log };
}

const stored = (id: string, over: Partial<StoredEvent> = {}): StoredEvent => ({
  luma_event_id: id,
  start_at: "2026-12-01T18:00:00.000Z",
  end_at: "2026-12-01T20:00:00.000Z",
  removed_from_luma: false,
  ...over,
});

describe("runSync", () => {
  it("inserts a new public event with a slug and the description from get-event", async () => {
    const { reader, detailCalls } = fakeLuma([lumaEvent("evt-newone1")]);
    const { store, log } = fakeStore();
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ created: 1, updated: 0, removed: 0, errors: 0 });
    expect(detailCalls).toEqual(["evt-newone1"]);
    expect(log.inserts[0]).toMatchObject({
      luma_event_id: "evt-newone1",
      slug: "event-evt-newone1-newone1",
      description: "About evt-newone1",
    });
  });

  it("updates an existing upcoming event, refreshing its description, and keeps its slug", async () => {
    const { reader, detailCalls } = fakeLuma([lumaEvent("evt-a")]);
    const { store, log } = fakeStore([stored("evt-a")]);
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ created: 0, updated: 1, removed: 0, errors: 0 });
    expect(detailCalls).toEqual(["evt-a"]);
    expect(log.updates[0].fields).toMatchObject({ title: "Event evt-a", description: "About evt-a" });
    expect(log.updates[0].fields).not.toHaveProperty("slug");
  });

  it("does not read details for an event that already ended, and keeps its stored description", async () => {
    const past = lumaEvent("evt-old", { start_at: "2026-10-01T18:00:00.000Z", end_at: "2026-10-01T20:00:00.000Z" });
    const { reader, detailCalls } = fakeLuma([past]);
    const { store, log } = fakeStore([stored("evt-old", { start_at: past.start_at, end_at: past.end_at ?? null })]);
    await runSync(reader, store, NOW);
    expect(detailCalls).toEqual([]);
    expect(log.updates[0].fields).not.toHaveProperty("description");
  });

  it("reads details for a brand-new event even if it already ended", async () => {
    const past = lumaEvent("evt-past1", { start_at: "2026-10-01T18:00:00.000Z", end_at: "2026-10-01T20:00:00.000Z" });
    const { reader, detailCalls } = fakeLuma([past]);
    const { store, log } = fakeStore();
    await runSync(reader, store, NOW);
    expect(detailCalls).toEqual(["evt-past1"]);
    expect(log.inserts).toHaveLength(1);
  });

  it("never imports an event that is not public", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-priv", { visibility: "private" })]);
    const { store, log } = fakeStore();
    const result = await runSync(reader, store, NOW);
    expect(result.created).toBe(0);
    expect(log.inserts).toHaveLength(0);
  });

  it("marks stored events that left the list, or stopped being public, as removed (and never deletes)", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-kept"), lumaEvent("evt-now-private", { visibility: "private" })]);
    const { store, log } = fakeStore([stored("evt-kept"), stored("evt-gone"), stored("evt-now-private")]);
    const result = await runSync(reader, store, NOW);
    expect(result.removed).toBe(2);
    expect(log.removed).toEqual([["evt-gone", "evt-now-private"]]);
  });

  it("does not mark an already-removed event again, and updates an event that comes back", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-back")]);
    const { store, log } = fakeStore([stored("evt-back", { removed_from_luma: true }), stored("evt-still-gone", { removed_from_luma: true })]);
    const result = await runSync(reader, store, NOW);
    expect(result.removed).toBe(0);
    expect(log.removed).toEqual([]);
    expect(log.updates.map((u) => u.id)).toEqual(["evt-back"]);
  });

  it("writes nothing and hides nothing when the Luma listing fails", async () => {
    const { reader } = fakeLuma([], { listError: new Error("Luma is down") });
    const { store, log } = fakeStore([stored("evt-a")]);
    await expect(runSync(reader, store, NOW)).rejects.toThrow("Luma is down");
    expect(log).toMatchObject({ inserts: [], updates: [], errors: [], removed: [] });
  });

  it("goes on after one event fails, counts it, and records the error only on an existing row", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-bad1"), lumaEvent("evt-new2"), lumaEvent("evt-ok3")], {
      detailErrors: ["evt-bad1", "evt-new2"],
    });
    const { store, log } = fakeStore([stored("evt-bad1")]);
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ created: 1, updated: 0, removed: 0, errors: 2 });
    expect(log.errors).toEqual([{ id: "evt-bad1", message: "detail failed for evt-bad1" }]);
    expect(log.inserts.map((r) => r.luma_event_id)).toEqual(["evt-ok3"]);
  });

  it("never sends hidden or status to the store (the sync cannot undo an admin's hide)", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a"), lumaEvent("evt-new9")]);
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    for (const payload of [...log.inserts, ...log.updates.map((u) => u.fields)]) {
      expect(payload).not.toHaveProperty("hidden");
      expect(payload).not.toHaveProperty("status");
    }
  });
});
