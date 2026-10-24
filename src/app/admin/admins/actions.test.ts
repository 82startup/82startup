import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const getAdmin = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/guard", () => ({ getAdmin }));

const { setMemberRole } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};
const asAdmin = (rpcResult: { error: { code?: string } | null } = { error: null }) => {
  const rpc = vi.fn(async () => rpcResult);
  getAdmin.mockResolvedValue({ supabase: { rpc }, check: { status: "admin", userId: "u1" } });
  return rpc;
};

beforeEach(() => {
  for (const fn of [revalidatePath, getAdmin, redirect]) fn.mockClear();
});

describe("setMemberRole", () => {
  it("sends a logged-out visitor to log in", async () => {
    getAdmin.mockResolvedValue({ supabase: {}, check: { status: "logged-out" } });
    await expect(setMemberRole({}, form({ id: ID, role: "admin" }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/admins");
  });

  it("refuses a member without calling the database", async () => {
    getAdmin.mockResolvedValue({ supabase: { rpc: vi.fn() }, check: { status: "not-admin" } });
    expect(await setMemberRole({}, form({ id: ID, role: "admin" }))).toEqual({ error: "You are not allowed to do that." });
  });

  it("changes the role through the database function and refreshes the page", async () => {
    const rpc = asAdmin();
    expect(await setMemberRole({}, form({ id: ID, role: "admin" }))).toEqual({});
    expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_set_role", { p_member: ID, p_role: "admin" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/admins");
  });

  it("refuses a bad id or role before calling the database", async () => {
    const rpc = asAdmin();
    expect(await setMemberRole({}, form({ id: "nope", role: "admin" }))).toEqual({ error: "Could not save. Try again." });
    expect(await setMemberRole({}, form({ id: ID, role: "boss" }))).toEqual({ error: "Could not save. Try again." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says plainly when the database refuses (for example your own role)", async () => {
    asAdmin({ error: { code: "22023" } });
    expect(await setMemberRole({}, form({ id: ID, role: "member" }))).toEqual({ error: "You cannot change your own role." });
  });
});
