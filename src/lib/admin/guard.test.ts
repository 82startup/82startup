import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { checkAdmin } = await import("./guard");

function fakeClient(opts: { sub?: string | null; rpc?: { data?: unknown; error?: unknown } }) {
  const rpc = vi.fn(async () => opts.rpc ?? { data: null, error: null });
  const client = {
    auth: { getClaims: vi.fn(async () => ({ data: opts.sub ? { claims: { sub: opts.sub } } : null })) },
    rpc,
  };
  return { client: client as unknown as Parameters<typeof checkAdmin>[0], rpc };
}

describe("checkAdmin", () => {
  it("says logged-out without asking the database when there is no session", async () => {
    const { client, rpc } = fakeClient({ sub: null });
    expect(await checkAdmin(client)).toEqual({ status: "logged-out" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says admin only when is_admin returns true", async () => {
    const { client, rpc } = fakeClient({ sub: "user-1", rpc: { data: true, error: null } });
    expect(await checkAdmin(client)).toEqual({ status: "admin", userId: "user-1" });
    expect(rpc).toHaveBeenCalledWith("is_admin");
  });

  it("fails closed: false, null, a non-boolean and an error all mean not-admin", async () => {
    for (const rpc of [{ data: false, error: null }, { data: null, error: null }, { data: "true", error: null }, { data: true, error: { message: "boom" } }]) {
      const { client } = fakeClient({ sub: "user-1", rpc });
      expect(await checkAdmin(client)).toEqual({ status: "not-admin" });
    }
  });
});
