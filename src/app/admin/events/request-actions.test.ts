import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/site/fake-supabase";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const getAdmin = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/guard", () => ({ getAdmin }));

const { rejectEventRequest } = await import("./request-actions");

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

beforeEach(() => {
  for (const fn of [revalidatePath, getAdmin]) fn.mockReset();
});

describe("rejectEventRequest", () => {
  it("sends a visitor to log in and refuses a member, calling nothing", async () => {
    const db = fakeSupabase();
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "logged-out" } });
    await expect(rejectEventRequest({}, form({ id: ID }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/events");
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "not-admin" } });
    expect((await rejectEventRequest({}, form({ id: ID }))).error).toBeTruthy();
    expect(db.rpcCalls).toEqual([]);
  });

  it("rejects through the admin function with the reason and refreshes", async () => {
    const db = fakeSupabase({ "rpc:admin_reject_event_request": { data: null, error: null } });
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "admin", userId: "u1" } });
    expect(await rejectEventRequest({}, form({ id: ID, reason: "  Not a fit " }))).toEqual({});
    expect(db.rpcCalls[0]).toMatchObject({ name: "admin_reject_event_request", args: { p_id: ID, p_reason: "Not a fit" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/events");
  });

  it("refuses a bad id or a long reason without calling the database, and answers plainly on failure", async () => {
    const db = fakeSupabase({ "rpc:admin_reject_event_request": { data: null, error: { code: "P0002", message: "secret" } } });
    getAdmin.mockResolvedValue({ supabase: db.supabase, check: { status: "admin", userId: "u1" } });
    expect((await rejectEventRequest({}, form({ id: "x" }))).error).toBeTruthy();
    expect((await rejectEventRequest({}, form({ id: ID, reason: "x".repeat(301) }))).error).toBeTruthy();
    expect(db.rpcCalls).toEqual([]);
    const state = await rejectEventRequest({}, form({ id: ID }));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain("secret");
  });
});
