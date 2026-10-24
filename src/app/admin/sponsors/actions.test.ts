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

const { saveSponsor, deleteSponsor, setSponsorVisible, moveSponsor, saveContactLink } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const OLD_LOGO = "sponsors/99999999-2222-3333-4444-555555555555.png";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const form = (values: Record<string, string | File>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};
const pngFile = () => new File([PNG], "logo.png", { type: "image/png" });

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
  ["saveSponsor", () => saveSponsor({}, form({ name: "Acme", tier: "gold" }))],
  ["deleteSponsor", () => deleteSponsor({}, form({ id: ID }))],
  ["setSponsorVisible", () => setSponsorVisible({}, form({ id: ID, value: "true" }))],
  ["moveSponsor", () => moveSponsor({}, form({ id: ID, direction: "up" }))],
  ["saveContactLink", () => saveContactLink({}, form({ contact: "https://x.test/c" }))],
] as const)("%s access", (_name, run) => {
  it("sends a logged-out caller to the login page and changes nothing", async () => {
    const db = fakeSupabase();
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "logged-out" } });
    await expect(run()).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/sponsors");
    expect(db.calls).toEqual([]);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses a member who is not an admin and changes nothing", async () => {
    const db = fakeSupabase();
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "not-admin" } });
    expect((await run()).error).toBeTruthy();
    expect(db.calls).toEqual([]);
    expect(db.uploads).toEqual([]);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("saveSponsor", () => {
  it("adds a new sponsor at the end, trimmed, then refreshes the public pages", async () => {
    const db = asAdmin({ "sponsors:select": { data: { sort_order: 4 }, error: null }, "sponsors:insert": { error: null } });
    expect(await saveSponsor({}, form({ name: " Acme ", tier: "platinum", website_url: "https://acme.test", description: "About" }))).toEqual({ saved: true });
    const insert = db.calls.find((c) => c.op === "insert");
    expect(insert?.payload).toMatchObject({ name: "Acme", tier: "platinum", website_url: "https://acme.test", description: "About", sort_order: 5 });
    expect(updateTag).toHaveBeenCalledWith("sponsors");
    expect(revalidatePath).toHaveBeenCalledWith("/sponsors");
  });

  it("refuses bad fields with a message each, without touching the database", async () => {
    const db = asAdmin();
    const state = await saveSponsor({}, form({ name: "", tier: "titanium", website_url: "http://x.test" }));
    expect(state.errors).toMatchObject({ name: expect.any(String), tier: expect.any(String), website_url: expect.any(String) });
    expect(db.calls).toEqual([]);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("stores a real picture under sponsors/ and saves its path, never an address", async () => {
    const db = asAdmin({ "sponsors:select": { data: null, error: null }, "sponsors:insert": { error: null } });
    await saveSponsor({}, form({ name: "Acme", tier: "gold", logo: pngFile() }));
    expect(db.uploads).toHaveLength(1);
    expect(db.uploads[0].path).toMatch(/^sponsors\/[0-9a-f-]{36}\.png$/);
    expect(db.uploads[0].type).toBe("image/png");
    expect((db.calls.find((c) => c.op === "insert")?.payload as { logo_path: string }).logo_path).toBe(db.uploads[0].path);
  });

  it("refuses an SVG, a text file named like a picture, and an oversize file, uploading and saving nothing", async () => {
    const bad = [
      new File(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], "a.png", { type: "image/png" }),
      new File(["just text"], "a.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(512001).fill(1)])], "big.png", { type: "image/png" }),
    ];
    for (const logo of bad) {
      const db = asAdmin();
      const state = await saveSponsor({}, form({ name: "Acme", tier: "gold", logo }));
      expect(state.errors?.logo).toBeTruthy();
      expect(db.uploads).toEqual([]);
      expect(db.calls.some((c) => c.op === "insert")).toBe(false);
    }
  });

  it("changes an existing sponsor, replaces its picture and removes the old file", async () => {
    const db = asAdmin({ "sponsors:select": { data: { logo_path: OLD_LOGO }, error: null }, "sponsors:update": { data: { id: ID }, error: null } });
    expect(await saveSponsor({}, form({ id: ID, name: "Acme", tier: "silver", logo: pngFile() }))).toEqual({ saved: true });
    expect(db.calls.find((c) => c.op === "update")?.filters).toEqual([["id", ID]]);
    expect(db.removed).toEqual([[OLD_LOGO]]);
  });

  it("removes the picture when asked, and leaves it alone when nothing is said", async () => {
    let db = asAdmin({ "sponsors:select": { data: { logo_path: OLD_LOGO }, error: null }, "sponsors:update": { data: { id: ID }, error: null } });
    await saveSponsor({}, form({ id: ID, name: "Acme", tier: "gold", remove_logo: "on" }));
    expect((db.calls.find((c) => c.op === "update")?.payload as { logo_path: null }).logo_path).toBeNull();
    expect(db.removed).toEqual([[OLD_LOGO]]);
    db = asAdmin({ "sponsors:select": { data: { logo_path: OLD_LOGO }, error: null }, "sponsors:update": { data: { id: ID }, error: null } });
    await saveSponsor({}, form({ id: ID, name: "Acme", tier: "gold" }));
    expect(db.calls.find((c) => c.op === "update")?.payload).not.toHaveProperty("logo_path");
    expect(db.removed).toEqual([]);
  });

  it("removes a just-uploaded picture again when the row cannot be saved, and does not refresh", async () => {
    const db = asAdmin({ "sponsors:select": { data: null, error: null }, "sponsors:insert": { error: { message: "denied" } } });
    const state = await saveSponsor({}, form({ name: "Acme", tier: "gold", logo: pngFile() }));
    expect(state.error).toBeTruthy();
    expect(db.removed).toEqual([[db.uploads[0].path]]);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses an edit of a sponsor that does not exist and a malformed id", async () => {
    asAdmin({ "sponsors:select": { data: null, error: null } });
    expect((await saveSponsor({}, form({ id: ID, name: "Acme", tier: "gold" }))).error).toBeTruthy();
    expect((await saveSponsor({}, form({ id: "nope", name: "Acme", tier: "gold" }))).error).toBeTruthy();
  });
});

describe("deleteSponsor", () => {
  it("deletes the row and its picture, then refreshes", async () => {
    const db = asAdmin({ "sponsors:select": { data: { logo_path: OLD_LOGO }, error: null }, "sponsors:delete": { error: null } });
    expect(await deleteSponsor({}, form({ id: ID }))).toEqual({});
    expect(db.calls.find((c) => c.op === "delete")?.filters).toEqual([["id", ID]]);
    expect(db.removed).toEqual([[OLD_LOGO]]);
    expect(updateTag).toHaveBeenCalledWith("sponsors");
  });
  it("never deletes a file that is not one of our own sponsor pictures", async () => {
    const db = asAdmin({ "sponsors:select": { data: { logo_path: "avatars/someone/a.jpg" }, error: null }, "sponsors:delete": { error: null } });
    await deleteSponsor({}, form({ id: ID }));
    expect(db.removed).toEqual([]);
  });
  it("keeps the picture when the row cannot be deleted", async () => {
    const db = asAdmin({ "sponsors:select": { data: { logo_path: OLD_LOGO }, error: null }, "sponsors:delete": { error: { message: "denied" } } });
    expect((await deleteSponsor({}, form({ id: ID }))).error).toBeTruthy();
    expect(db.removed).toEqual([]);
  });
});

describe("setSponsorVisible, moveSponsor, saveContactLink", () => {
  it("hides and shows only the given sponsor, and refuses a bad value", async () => {
    const db = asAdmin({ "sponsors:update": { data: { id: ID }, error: null } });
    await setSponsorVisible({}, form({ id: ID, value: "false" }));
    expect(db.calls[0].payload).toMatchObject({ visible: false });
    expect(db.calls[0].filters).toEqual([["id", ID]]);
    expect((await setSponsorVisible({}, form({ id: ID, value: "maybe" }))).error).toBeTruthy();
  });

  it("moves a sponsor by swapping its order with its neighbour in the same tier", async () => {
    const rows = [
      { id: "a", sort_order: 1, tier: "gold" },
      { id: ID, sort_order: 2, tier: "gold" },
      { id: "z", sort_order: 1, tier: "bronze" },
    ];
    const db = asAdmin({ "sponsors:select": { data: rows, error: null }, "sponsors:update": { error: null } });
    expect(await moveSponsor({}, form({ id: ID, direction: "up" }))).toEqual({});
    const updates = db.calls.filter((c) => c.op === "update");
    expect(updates.map((c) => [c.filters[0][1], (c.payload as { sort_order: number }).sort_order])).toEqual([[ID, 1], ["a", 2]]);
  });

  it("does nothing, and does not fail, at the end of the list", async () => {
    const db = asAdmin({ "sponsors:select": { data: [{ id: ID, sort_order: 1, tier: "gold" }], error: null } });
    expect(await moveSponsor({}, form({ id: ID, direction: "up" }))).toEqual({});
    expect(db.calls.filter((c) => c.op === "update")).toEqual([]);
  });

  it("saves, changes and clears the contact link, and refuses anything but https or mailto", async () => {
    const db = asAdmin({ "site_settings:upsert": { error: null }, "site_settings:delete": { error: null } });
    expect(await saveContactLink({}, form({ contact: "mailto:sponsors@x.test" }))).toEqual({ saved: true });
    expect(db.calls[0].payload).toMatchObject({ key: "sponsor_contact_url", value: "mailto:sponsors@x.test" });
    expect(await saveContactLink({}, form({ contact: "" }))).toEqual({ saved: true });
    expect(db.calls[1].op).toBe("delete");
    expect((await saveContactLink({}, form({ contact: "javascript:alert(1)" }))).error).toBeTruthy();
  });
});
