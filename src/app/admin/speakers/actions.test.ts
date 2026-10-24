import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/site/fake-supabase";

const updateTag = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const getAdmin = vi.fn();

vi.mock("next/cache", () => ({ updateTag, revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/guard", () => ({ getAdmin }));

const { saveSpeaker, deleteSpeaker, setSpeakerVisible, moveSpeaker } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const EVENT = "66666666-2222-3333-4444-555555555555";
const EVENT2 = "77777777-2222-3333-4444-555555555555";
const OLD_PHOTO = "speakers/99999999-2222-3333-4444-555555555555.jpg";
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const form = (values: Record<string, string | File>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function asAdmin(results = {}) {
  const db = fakeSupabase(results);
  getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "admin", userId: "u1" } });
  return db;
}

beforeEach(() => {
  for (const fn of [updateTag, revalidatePath, getAdmin, redirect]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe.each([
  ["saveSpeaker", () => saveSpeaker({}, form({ name: "Ada" }))],
  ["deleteSpeaker", () => deleteSpeaker({}, form({ id: ID }))],
  ["setSpeakerVisible", () => setSpeakerVisible({}, form({ id: ID, value: "true" }))],
  ["moveSpeaker", () => moveSpeaker({}, form({ id: ID, direction: "up" }))],
] as const)("%s access", (_name, run) => {
  it("sends a logged-out caller to the login page and refuses a non-admin, changing nothing", async () => {
    const db = fakeSupabase();
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "logged-out" } });
    await expect(run()).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/speakers");
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "not-admin" } });
    expect((await run()).error).toBeTruthy();
    expect(db.calls).toEqual([]);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("saveSpeaker", () => {
  it("adds a speaker with a page address made from the name, at the end of the order, then links its events", async () => {
    const db = asAdmin({ "speakers:select": { data: [{ slug: "ada-lee", sort_order: 3 }], error: null }, "speakers:insert": { data: { id: ID }, error: null } });
    const data = form({ name: "Ada Lee", job_title: "CEO", company: "Acme" });
    data.append("event_ids", EVENT);
    data.append("event_ids", EVENT2);
    expect(await saveSpeaker({}, data)).toEqual({ saved: true });
    expect(db.calls.find((c) => c.op === "insert")?.payload).toMatchObject({ name: "Ada Lee", slug: "ada-lee-2", sort_order: 4, job_title: "CEO" });
    expect(db.calls.find((c) => c.op === "insert")?.payload).not.toHaveProperty("event_id");
    expect(db.rpcCalls).toEqual([{ name: "admin_set_speaker_events", args: { p_speaker: ID, p_events: [EVENT, EVENT2] } }]);
    expect(updateTag).toHaveBeenCalledWith("speakers");
  });

  it("replaces the events of an existing speaker (an empty choice clears them)", async () => {
    const db = asAdmin({ "speakers:select": { data: { photo_path: null }, error: null }, "speakers:update": { data: { id: ID }, error: null } });
    await saveSpeaker({}, form({ id: ID, name: "Ada" }));
    expect(db.rpcCalls).toEqual([{ name: "admin_set_speaker_events", args: { p_speaker: ID, p_events: [] } }]);
  });

  it("reports a failure to save the events, with a plain message, and does not refresh", async () => {
    asAdmin({ "speakers:select": { data: { photo_path: null }, error: null }, "speakers:update": { data: { id: ID }, error: null }, "rpc:admin_set_speaker_events": { data: null, error: { code: "23503", message: "fk secret" } } });
    const state = await saveSpeaker({}, form({ id: ID, name: "Ada" }));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain("fk secret");
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses bad fields without touching the database", async () => {
    const db = asAdmin();
    const data = form({ name: "" });
    data.append("event_ids", "nope");
    const state = await saveSpeaker({}, data);
    expect(state.errors).toMatchObject({ name: expect.any(String), event_ids: expect.any(String) });
    expect(db.calls).toEqual([]);
  });

  it("keeps the page address when an existing speaker is edited, even if the name changes", async () => {
    const db = asAdmin({ "speakers:select": { data: { photo_path: null }, error: null }, "speakers:update": { data: { id: ID }, error: null } });
    await saveSpeaker({}, form({ id: ID, name: "A Completely New Name" }));
    expect(db.calls.find((c) => c.op === "update")?.payload).not.toHaveProperty("slug");
  });

  it("stores a photo under speakers/, replaces the old one and removes the old file", async () => {
    const db = asAdmin({ "speakers:select": { data: { photo_path: OLD_PHOTO }, error: null }, "speakers:update": { data: { id: ID }, error: null } });
    await saveSpeaker({}, form({ id: ID, name: "Ada", photo: new File([JPG], "me.jpg", { type: "image/jpeg" }) }));
    expect(db.uploads[0].path).toMatch(/^speakers\/[0-9a-f-]{36}\.jpg$/);
    expect(db.removed).toEqual([[OLD_PHOTO]]);
  });

  it("refuses an SVG photo", async () => {
    const db = asAdmin();
    const state = await saveSpeaker({}, form({ name: "Ada", photo: new File(["<svg/>"], "me.png", { type: "image/png" }) }));
    expect(state.errors?.photo).toBeTruthy();
    expect(db.uploads).toEqual([]);
  });
});

describe("deleteSpeaker, setSpeakerVisible, moveSpeaker", () => {
  it("deletes the speaker and its photo", async () => {
    const db = asAdmin({ "speakers:select": { data: { photo_path: OLD_PHOTO }, error: null }, "speakers:delete": { error: null } });
    expect(await deleteSpeaker({}, form({ id: ID }))).toEqual({});
    expect(db.removed).toEqual([[OLD_PHOTO]]);
  });
  it("hides a speaker, refusing a bad value", async () => {
    const db = asAdmin({ "speakers:update": { data: { id: ID }, error: null } });
    await setSpeakerVisible({}, form({ id: ID, value: "false" }));
    expect(db.calls[0].payload).toMatchObject({ visible: false });
    expect((await setSpeakerVisible({}, form({ id: ID, value: "x" }))).error).toBeTruthy();
  });
  it("moves a speaker one place and renumbers", async () => {
    const rows = [{ id: "a", sort_order: 1 }, { id: "b", sort_order: 2 }, { id: ID, sort_order: 3 }];
    const db = asAdmin({ "speakers:select": { data: rows, error: null }, "speakers:update": { error: null } });
    await moveSpeaker({}, form({ id: ID, direction: "up" }));
    expect(db.calls.filter((c) => c.op === "update").map((c) => [c.filters[0][1], (c.payload as { sort_order: number }).sort_order])).toEqual([[ID, 2], ["b", 3]]);
  });
});
