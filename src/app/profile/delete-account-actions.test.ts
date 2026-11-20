import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();
const createAdminClient = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const { deleteAccount } = await import("./delete-account-actions");

const form = (confirm: string) => {
  const data = new FormData();
  data.set("confirm", confirm);
  return data;
};

function setup(opts: { sub?: string | null; isAdmin?: boolean; deleteError?: unknown } = {}) {
  const signOut = vi.fn(async () => ({ error: null }));
  createClient.mockResolvedValue({
    auth: { getClaims: async () => ({ data: opts.sub === null ? null : { claims: { sub: opts.sub ?? "user-1" } } }), signOut },
    rpc: async () => ({ data: opts.isAdmin ?? false, error: null }),
  });
  const remove = vi.fn(async () => ({ error: null }));
  // user-1/ holds a.jpg and a folder post-1/ holding b.jpg.
  const list = vi.fn(async (folder: string) => ({
    data: folder === "user-1" ? [{ id: "1", name: "a.jpg" }, { id: null, name: "post-1" }] : folder === "user-1/post-1" ? [{ id: "2", name: "b.jpg" }] : [],
    error: null,
  }));
  const deleteUser = vi.fn(async () => ({ error: opts.deleteError ?? null }));
  createAdminClient.mockReturnValue({ storage: { from: () => ({ list, remove }) }, auth: { admin: { deleteUser } } });
  return { signOut, remove, deleteUser };
}

describe("deleteAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a signed-out visitor to sign in", async () => {
    setup({ sub: null });
    await expect(deleteAccount({}, form("DELETE"))).rejects.toThrow("NEXT_REDIRECT:/login?next=/profile");
  });

  it("requires the confirmation word", async () => {
    const { deleteUser } = setup();
    expect(await deleteAccount({}, form("delete me"))).toEqual({ error: expect.stringContaining("DELETE") });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("refuses an admin", async () => {
    const { deleteUser } = setup({ isAdmin: true });
    expect((await deleteAccount({}, form("DELETE"))).error).toMatch(/Admins/);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("removes the member's files, deletes the user, signs out and goes home", async () => {
    const { remove, deleteUser, signOut } = setup();
    await expect(deleteAccount({}, form(" DELETE "))).rejects.toThrow("NEXT_REDIRECT:/");
    expect(remove).toHaveBeenCalledWith(["user-1/a.jpg", "user-1/post-1/b.jpg"]);
    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(signOut).toHaveBeenCalled();
  });

  it("reports a failed deletion and stays signed in", async () => {
    const { signOut } = setup({ deleteError: new Error("boom") });
    expect((await deleteAccount({}, form("DELETE"))).error).toMatch(/could not delete/);
    expect(signOut).not.toHaveBeenCalled();
  });
});
