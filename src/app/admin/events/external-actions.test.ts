import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/site/fake-supabase";

const updateTag = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const getAdmin = vi.fn();
const fetchEventPage = vi.fn();

vi.mock("next/cache", () => ({ updateTag, revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/guard", () => ({ getAdmin }));
vi.mock("@/lib/external/fetch", () => ({ fetchEventPage }));

const { readEventLink, refreshFromLink, saveExternalEvent, deleteExternalEvent } = await import("./external-actions");

const ID = "11111111-2222-3333-4444-555555555555";
const LINK = "https://www.eventbrite.com/e/founders-night-123";
const PAGE = `<html><head><script type="application/ld+json">${JSON.stringify({
  "@type": "Event", name: "Founders Night", description: "Come along", startDate: "2027-03-17T18:00:00-07:00", endDate: "2027-03-17T21:00:00-07:00",
  location: { "@type": "Place", name: "Fort Mason", address: { "@type": "PostalAddress", addressLocality: "San Francisco" } },
})}</script></head></html>`;
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};
const SAVE = {
  url: LINK, title: "Founders Night", description: "Come along", timezone: "America/Los_Angeles", start: "2027-03-17T18:00", end: "2027-03-17T21:00",
  location_type: "offline", venue_name: "Fort Mason", venue_city: "San Francisco", venue_address: "", cover_url: "",
};

function asAdmin(results = {}) {
  const db = fakeSupabase(results);
  getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "admin", userId: "u1" } });
  return db;
}

beforeEach(() => {
  for (const fn of [updateTag, revalidatePath, getAdmin, redirect, fetchEventPage]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe.each([
  ["readEventLink", () => readEventLink({}, form({ link: LINK }))],
  ["refreshFromLink", () => refreshFromLink({}, form({ id: ID }))],
  ["saveExternalEvent", () => saveExternalEvent({}, form(SAVE))],
  ["deleteExternalEvent", () => deleteExternalEvent({}, form({ id: ID }))],
] as const)("%s access", (_name, run) => {
  it("sends a logged-out caller to login and refuses a non-admin, reading and changing nothing", async () => {
    const db = fakeSupabase();
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "logged-out" } });
    await expect(run()).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/events");
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "not-admin" } });
    expect((await run()).error).toBeTruthy();
    expect(db.calls).toEqual([]);
    expect(db.rpcCalls).toEqual([]);
    expect(fetchEventPage).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("readEventLink", () => {
  it("reads a page into a preview to check, without saving anything", async () => {
    const db = asAdmin({ "events:select": { data: [], error: null } });
    fetchEventPage.mockResolvedValue({ ok: true, html: PAGE, finalUrl: LINK });
    const state = await readEventLink({}, form({ link: ` ${LINK}?utm_source=x ` }));
    expect(state.preview).toMatchObject({ url: LINK, host: "eventbrite.com", title: "Founders Night", timezone: "America/Los_Angeles", start: "2027-03-17T18:00", end: "2027-03-17T21:00", venueName: "Fort Mason" });
    expect(fetchEventPage).toHaveBeenCalledWith(LINK);
    expect(db.rpcCalls).toEqual([]);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses a link that is not a plain https address without fetching it", async () => {
    asAdmin();
    for (const link of ["http://eventbrite.com/e/x", "https://localhost/e", "https://127.0.0.1/e", "javascript:alert(1)", ""]) {
      const state = await readEventLink({}, form({ link }));
      expect(state.error).toBeTruthy();
      expect(state.preview).toBeUndefined();
    }
    expect(fetchEventPage).not.toHaveBeenCalled();
  });

  it("says so when the event is already added, or is one of our own calendar's, without fetching", async () => {
    asAdmin({ "events:select": { data: [{ id: ID, source: "external" }], error: null } });
    const duplicate = await readEventLink({}, form({ link: LINK }));
    asAdmin({ "events:select": { data: [{ id: ID, source: "luma" }], error: null } });
    const own = await readEventLink({}, form({ link: "https://lu.ma/abc123" }));
    expect(duplicate.error).toBeTruthy();
    expect(own.error).toBeTruthy();
    expect(duplicate.error).not.toBe(own.error);
    expect(fetchEventPage).not.toHaveBeenCalled();
  });

  it("offers to fill the form by hand, with a plain message, when the page cannot be read", async () => {
    asAdmin({ "events:select": { data: [], error: null } });
    const messages = new Set<string | undefined>();
    for (const reason of ["blocked", "timeout", "too_large", "not_html", "status", "network", "redirects"]) {
      fetchEventPage.mockResolvedValue({ ok: false, reason });
      const state = await readEventLink({}, form({ link: LINK }));
      expect(state.error).toBeTruthy();
      expect(state.fillByHand).toEqual({ url: LINK, host: "eventbrite.com" });
      messages.add(state.error);
    }
    expect(messages.size).toBeGreaterThanOrEqual(4);
  });

  it("offers the same when the page is not an event page", async () => {
    asAdmin({ "events:select": { data: [], error: null } });
    fetchEventPage.mockResolvedValue({ ok: true, html: "<html><body>hello</body></html>", finalUrl: LINK });
    const state = await readEventLink({}, form({ link: LINK }));
    expect(state.error).toBeTruthy();
    expect(state.fillByHand).toBeDefined();
  });
});

describe("refreshFromLink", () => {
  it("reads the stored link again and returns a preview for that event", async () => {
    asAdmin({ "events:select": { data: { external_url: LINK }, error: null } });
    fetchEventPage.mockResolvedValue({ ok: true, html: PAGE, finalUrl: LINK });
    const state = await refreshFromLink({}, form({ id: ID }));
    expect(state.preview?.title).toBe("Founders Night");
    expect(fetchEventPage).toHaveBeenCalledWith(LINK);
  });
  it("refuses an event that is not an external one, and a malformed id", async () => {
    asAdmin({ "events:select": { data: null, error: null } });
    expect((await refreshFromLink({}, form({ id: ID }))).error).toBeTruthy();
    expect((await refreshFromLink({}, form({ id: "nope" }))).error).toBeTruthy();
    expect(fetchEventPage).not.toHaveBeenCalled();
  });
});

describe("saveExternalEvent", () => {
  it("adds an event through the admin function with the times in UTC, then refreshes the events", async () => {
    const db = asAdmin({ "events:select": { data: [], error: null }, "rpc:admin_save_external_event": { data: ID, error: null } });
    expect(await saveExternalEvent({}, form(SAVE))).toEqual({ saved: true });
    const call = db.rpcCalls[0];
    expect(call.name).toBe("admin_save_external_event");
    expect(call.args).toMatchObject({
      p_id: null, p_title: "Founders Night", p_start_at: "2027-03-18T01:00:00.000Z", p_end_at: "2027-03-18T04:00:00.000Z", p_timezone: "America/Los_Angeles",
      p_location_type: "offline", p_external_url: LINK, p_external_host: "eventbrite.com", p_hidden: false,
    });
    expect((call.args as { p_slug: string }).p_slug).toMatch(/^founders-night-[0-9a-f]{6}$/);
    expect(updateTag).toHaveBeenCalledWith("events");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/events");
  });

  it("changes an existing event by its id, leaving the page address alone", async () => {
    const db = asAdmin({ "rpc:admin_save_external_event": { data: ID, error: null } });
    await saveExternalEvent({}, form({ ...SAVE, id: ID, hidden: "on" }));
    expect(db.rpcCalls[0].args).toMatchObject({ p_id: ID, p_slug: null, p_hidden: true });
  });

  it("refuses bad fields with a message each, without touching the database", async () => {
    const db = asAdmin();
    const state = await saveExternalEvent({}, form({ ...SAVE, title: "", start: "", cover_url: "http://x.test/c.jpg" }));
    expect(state.errors).toMatchObject({ title: expect.any(String), start: expect.any(String), cover_url: expect.any(String) });
    expect(db.rpcCalls).toEqual([]);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses to add an event that is already in the calendar, and maps a duplicate from the database", async () => {
    asAdmin({ "events:select": { data: [{ id: ID, source: "luma" }], error: null } });
    expect((await saveExternalEvent({}, form({ ...SAVE, url: "https://lu.ma/abc123" }))).error).toBeTruthy();
    const db = asAdmin({ "events:select": { data: [], error: null }, "rpc:admin_save_external_event": { data: null, error: { code: "23505", message: "duplicate key" } } });
    const state = await saveExternalEvent({}, form(SAVE));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain("duplicate key");
    expect(db.rpcCalls).toHaveLength(1);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("answers with a plain message, never the database text, on any other failure", async () => {
    asAdmin({ "events:select": { data: [], error: null }, "rpc:admin_save_external_event": { data: null, error: { code: "XX000", message: "internal secret" } } });
    const state = await saveExternalEvent({}, form(SAVE));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain("internal secret");
  });
});

describe("deleteExternalEvent", () => {
  it("deletes through the admin function and refreshes", async () => {
    const db = asAdmin({ "rpc:admin_delete_external_event": { data: null, error: null } });
    expect(await deleteExternalEvent({}, form({ id: ID }))).toEqual({});
    expect(db.rpcCalls[0]).toEqual({ name: "admin_delete_external_event", args: { p_id: ID } });
    expect(updateTag).toHaveBeenCalledWith("events");
  });
  it("refuses a malformed id and reports a failure without refreshing", async () => {
    const db = asAdmin({ "rpc:admin_delete_external_event": { data: null, error: { code: "P0002", message: "x" } } });
    expect((await deleteExternalEvent({}, form({ id: "nope" }))).error).toBeTruthy();
    expect(db.rpcCalls).toEqual([]);
    expect((await deleteExternalEvent({}, form({ id: ID }))).error).toBeTruthy();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
