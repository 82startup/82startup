import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const getAdmin = vi.fn();
const runLumaSync = vi.fn();

class MissingConfigError extends Error {}

vi.mock("next/cache", () => ({ updateTag, revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/guard", () => ({ getAdmin }));
vi.mock("@/lib/luma/run", () => ({ runLumaSync, MissingConfigError }));

const { setFeatured, setHidden, syncNow } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeDb(result: { data?: unknown; error?: unknown } = { data: { id: ID }, error: null }) {
  const calls: { update?: unknown; eq?: unknown[] } = {};
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn((payload: unknown) => ((calls.update = payload), chain));
  chain.eq = vi.fn((...args: unknown[]) => ((calls.eq = args), chain));
  chain.select = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => result);
  return { supabase: { from: vi.fn(() => chain) }, chain, calls };
}

const asAdmin = (db = fakeDb()) => {
  getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "admin", userId: "u1" } });
  return db;
};

beforeEach(() => {
  for (const fn of [updateTag, revalidatePath, getAdmin, runLumaSync, redirect]) fn.mockClear();
  runLumaSync.mockReset();
});

describe.each([
  ["setFeatured", setFeatured, "featured"],
  ["setHidden", setHidden, "hidden"],
] as const)("%s", (_name, action, column) => {
  it("sends a logged-out caller to the login page and changes nothing", async () => {
    const db = fakeDb();
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "logged-out" } });
    await expect(action({}, form({ id: ID, value: "true" }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/events");
    expect(db.supabase.from).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses a caller who is not an admin and changes nothing", async () => {
    const db = fakeDb();
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "not-admin" } });
    const result = await action({}, form({ id: ID, value: "true" }));
    expect(result.error).toBeTruthy();
    expect(db.supabase.from).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses a malformed form without touching the database", async () => {
    const db = asAdmin();
    const bads: Record<string, string>[] = [{ id: "nope", value: "true" }, { id: ID, value: "maybe" }, {}];
    for (const bad of bads) {
      expect((await action({}, form(bad))).error).toBeTruthy();
    }
    expect(db.supabase.from).not.toHaveBeenCalled();
  });

  it("updates only its own column for the given event, then refreshes the caches", async () => {
    const db = asAdmin();
    expect(await action({}, form({ id: ID, value: "true" }))).toEqual({});
    expect(db.supabase.from).toHaveBeenCalledWith("events");
    expect(db.calls.update).toEqual({ [column]: true });
    expect(db.calls.eq).toEqual(["id", ID]);
    expect(updateTag).toHaveBeenCalledWith("events");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/events");
  });

  it("can switch off as well as on", async () => {
    const db = asAdmin();
    await action({}, form({ id: ID, value: "false" }));
    expect(db.calls.update).toEqual({ [column]: false });
  });

  it("reports an error, and does not refresh, when the update fails or matches no row", async () => {
    for (const result of [{ data: null, error: { message: "denied" } }, { data: null, error: null }]) {
      asAdmin(fakeDb(result));
      expect((await action({}, form({ id: ID, value: "true" }))).error).toBeTruthy();
    }
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("syncNow", () => {
  it("sends a logged-out caller to the login page and does not sync", async () => {
    getAdmin.mockResolvedValue({ supabase: {}, check: { status: "logged-out" } });
    await expect(syncNow()).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/events");
    expect(runLumaSync).not.toHaveBeenCalled();
  });

  it("refuses a caller who is not an admin and does not sync", async () => {
    getAdmin.mockResolvedValue({ supabase: {}, check: { status: "not-admin" } });
    expect((await syncNow()).error).toBeTruthy();
    expect(runLumaSync).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("runs the sync for an admin, returns the counts and refreshes the caches", async () => {
    asAdmin();
    runLumaSync.mockResolvedValue({ created: 1, updated: 2, removed: 0, errors: 0 });
    expect(await syncNow()).toEqual({ sync: { created: 1, updated: 2, removed: 0, errors: 0 } });
    expect(updateTag).toHaveBeenCalledWith("events");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/events");
  });

  it("says Luma is not configured when the key is missing", async () => {
    asAdmin();
    runLumaSync.mockImplementation(async () => {
      throw new MissingConfigError("LUMA_API_KEY is not set");
    });
    expect((await syncNow()).error).toMatch(/not configured/i);
  });

  it("gives a generic message, never the underlying one, when the sync fails", async () => {
    asAdmin();
    runLumaSync.mockImplementation(async () => {
      throw new Error("secret detail from Luma");
    });
    const result = await syncNow();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("secret detail");
    expect(updateTag).not.toHaveBeenCalled();
  });
});
