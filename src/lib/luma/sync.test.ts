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

type LumaOptions = {
  listError?: Error;
  detailErrors?: string[];
  approvedCounts?: Record<string, number | undefined>;
  guestEmails?: Record<string, string[]>;
  guestErrors?: string[];
  markdown?: Record<string, string>;
};

function fakeLuma(events: LumaCalendarEvent[], opts: LumaOptions = {}) {
  const detailCalls: string[] = [];
  const guestCalls: string[] = [];
  const reader: LumaReader = {
    async listCalendarEvents() {
      if (opts.listError) throw opts.listError;
      return events;
    },
    async getEvent(id): Promise<LumaEventDetail> {
      detailCalls.push(id);
      if (opts.detailErrors?.includes(id)) throw new Error(`detail failed for ${id}`);
      const count = opts.approvedCounts?.[id];
      return {
        ...lumaEvent(id),
        description: `About ${id}`,
        ...(opts.markdown?.[id] === undefined ? {} : { description_md: opts.markdown[id] }),
        ...(count === undefined ? {} : { guest_counts: { approved: { guests: count } } }),
      };
    },
    async listApprovedGuestEmails(id) {
      guestCalls.push(id);
      if (opts.guestErrors?.includes(id)) throw new Error(`guest read failed for ${id} x@secret.test`);
      return opts.guestEmails?.[id] ?? [];
    },
  };
  return { reader, detailCalls, guestCalls };
}

function fakeStore(stored: StoredEvent[] = [], opts: { matched?: number; attendeeError?: boolean } = {}) {
  const log = {
    inserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<{ id: string; fields: Record<string, unknown> }>,
    errors: [] as Array<{ id: string; message: string }>,
    removed: [] as string[][],
    attendees: [] as Array<{ id: string; emails: string[] }>,
    order: [] as string[],
    listed: 0,
  };
  const store: EventStore = {
    async listStored() {
      log.listed++;
      return stored;
    },
    async insert(row) {
      log.order.push(`insert:${row.luma_event_id}`);
      log.inserts.push(row);
    },
    async update(id, fields) {
      log.order.push(`update:${id}`);
      log.updates.push({ id, fields });
    },
    async markError(id, message) {
      log.errors.push({ id, message });
    },
    async markRemoved(ids) {
      log.removed.push(ids);
    },
    async syncAttendees(id, emails) {
      log.order.push(`attendees:${id}`);
      if (opts.attendeeError) throw new Error(`attendee sync failed for ${emails.join(",")}`);
      log.attendees.push({ id, emails });
      return { matched: opts.matched ?? 0 };
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

const ZERO = { created: 0, updated: 0, removed: 0, errors: 0, attendees: 0 };

describe("runSync", () => {
  it("inserts a new public event with a slug and the description from get-event", async () => {
    const { reader, detailCalls } = fakeLuma([lumaEvent("evt-newone1")]);
    const { store, log } = fakeStore();
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ ...ZERO, created: 1 });
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
    expect(result).toEqual({ ...ZERO, updated: 1 });
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
    expect(log).toMatchObject({ inserts: [], updates: [], errors: [], removed: [], attendees: [] });
  });

  it("goes on after one event fails, counts it, and records the error only on an existing row", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-bad1"), lumaEvent("evt-new2"), lumaEvent("evt-ok3")], {
      detailErrors: ["evt-bad1", "evt-new2"],
    });
    const { store, log } = fakeStore([stored("evt-bad1")]);
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ ...ZERO, created: 1, errors: 2 });
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

describe("runSync attendees", () => {
  it("stores Luma's approved count, then reads the guest list and matches it, after the event is written", async () => {
    const { reader, guestCalls } = fakeLuma([lumaEvent("evt-a")], {
      approvedCounts: { "evt-a": 7 },
      guestEmails: { "evt-a": ["a@x.test", "b@x.test"] },
    });
    const { store, log } = fakeStore([stored("evt-a")], { matched: 2 });
    const result = await runSync(reader, store, NOW);
    expect(log.updates[0].fields).toMatchObject({ luma_approved_count: 7 });
    expect(guestCalls).toEqual(["evt-a"]);
    expect(log.attendees).toEqual([{ id: "evt-a", emails: ["a@x.test", "b@x.test"] }]);
    expect(log.order).toEqual(["update:evt-a", "attendees:evt-a"]);
    expect(result).toEqual({ ...ZERO, updated: 1, attendees: 2 });
  });

  it("does the same for a new event: the row is inserted before its attendees are matched", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-new1")], { approvedCounts: { "evt-new1": 3 }, guestEmails: { "evt-new1": ["a@x.test"] } });
    const { store, log } = fakeStore([], { matched: 1 });
    const result = await runSync(reader, store, NOW);
    expect(log.inserts[0]).toMatchObject({ luma_approved_count: 3 });
    expect(log.order).toEqual(["insert:evt-new1", "attendees:evt-new1"]);
    expect(result).toEqual({ ...ZERO, created: 1, attendees: 1 });
  });

  it("does not send a count when the event details carry none", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a")]);
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    expect(log.updates[0].fields).not.toHaveProperty("luma_approved_count");
  });

  it("matches an empty guest list too (so members Luma no longer lists are cancelled)", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a")], { guestEmails: { "evt-a": [] } });
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    expect(log.attendees).toEqual([{ id: "evt-a", emails: [] }]);
  });

  it("leaves an event that already ended alone: no guest read, no matching, no count change", async () => {
    const past = lumaEvent("evt-old", { start_at: "2026-10-01T18:00:00.000Z", end_at: "2026-10-01T20:00:00.000Z" });
    const { reader, guestCalls } = fakeLuma([past], { approvedCounts: { "evt-old": 5 } });
    const { store, log } = fakeStore([stored("evt-old", { start_at: past.start_at, end_at: past.end_at ?? null })]);
    await runSync(reader, store, NOW);
    expect(guestCalls).toEqual([]);
    expect(log.attendees).toEqual([]);
    expect(log.updates[0].fields).not.toHaveProperty("luma_approved_count");
  });

  it("touches no attendees when the guest list cannot be read, but still writes the event", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a"), lumaEvent("evt-b")], {
      guestErrors: ["evt-a"],
      guestEmails: { "evt-b": ["b@x.test"] },
    });
    const { store, log } = fakeStore([stored("evt-a"), stored("evt-b")], { matched: 1 });
    const result = await runSync(reader, store, NOW);
    expect(log.updates.map((u) => u.id)).toEqual(["evt-a", "evt-b"]);
    expect(log.attendees).toEqual([{ id: "evt-b", emails: ["b@x.test"] }]);
    expect(result).toEqual({ ...ZERO, updated: 2, errors: 1, attendees: 1 });
    expect(log.errors).toHaveLength(1);
    expect(log.errors[0].id).toBe("evt-a");
  });

  it("records a fixed message, never the underlying text or an email, when guest handling fails", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a")], { guestErrors: ["evt-a"] });
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    expect(log.errors[0].message).toMatch(/guest list/i);
    expect(log.errors[0].message).not.toContain("secret.test");
  });

  it("counts an error, with no email in the message, when matching fails in the database", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a")], { guestEmails: { "evt-a": ["a@x.test"] } });
    const { store, log } = fakeStore([stored("evt-a")], { attendeeError: true });
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ ...ZERO, updated: 1, errors: 1 });
    expect(log.errors[0].message).not.toContain("a@x.test");
  });

  it("does not read guests for an event whose own write failed", async () => {
    const { reader, guestCalls } = fakeLuma([lumaEvent("evt-a")], { detailErrors: ["evt-a"] });
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    expect(guestCalls).toEqual([]);
    expect(log.attendees).toEqual([]);
  });
});

describe("runSync description_md", () => {
  it("stores Luma's markdown description for a new event and for an unfinished existing one", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-new1"), lumaEvent("evt-a")], {
      markdown: { "evt-new1": "# Hello\n\n![pic](https://images.lumacdn.com/x.jpg)", "evt-a": "**Bold**" },
    });
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    expect(log.inserts[0]).toMatchObject({ luma_event_id: "evt-new1", description_md: "# Hello\n\n![pic](https://images.lumacdn.com/x.jpg)" });
    expect(log.updates[0].fields).toMatchObject({ description_md: "**Bold**" });
  });

  it("stores an empty string when the details carry no markdown", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a")]);
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    expect(log.updates[0].fields).toMatchObject({ description_md: "" });
  });

  it("cuts a very long description at 20,000 characters without splitting an emoji", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a")], { markdown: { "evt-a": "😀".repeat(20005) } });
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    const saved = log.updates[0].fields.description_md as string;
    expect(Array.from(saved)).toHaveLength(20000);
    expect(saved).toBe("😀".repeat(20000));
  });

  it("does not send it for an event that already ended (it keeps what it had)", async () => {
    const past = lumaEvent("evt-old", { start_at: "2026-10-01T18:00:00.000Z", end_at: "2026-10-01T20:00:00.000Z" });
    const { reader } = fakeLuma([past], { markdown: { "evt-old": "ignored" } });
    const { store, log } = fakeStore([stored("evt-old", { start_at: past.start_at, end_at: past.end_at ?? null })]);
    await runSync(reader, store, NOW);
    expect(log.updates[0].fields).not.toHaveProperty("description_md");
  });
});
