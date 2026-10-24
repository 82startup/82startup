import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { saveNotificationPreferences } = await import("./notification-actions");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeClient(opts: { sub?: string | null; error?: { code?: string } | null } = {}) {
  const rpc = vi.fn(async () => ({ data: null, error: opts.error ?? null }));
  createClient.mockResolvedValue({
    auth: { getClaims: vi.fn(async () => ({ data: "sub" in opts && opts.sub === null ? null : { claims: { sub: opts.sub ?? "user-1" } } })) },
    rpc,
  });
  return rpc;
}

beforeEach(() => {
  for (const fn of [revalidatePath, redirect, createClient]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("saveNotificationPreferences", () => {
  it("sends a logged-out caller to the login page and saves nothing", async () => {
    const rpc = fakeClient({ sub: null });
    await expect(saveNotificationPreferences({}, form({ messages: "on" }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/settings");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves exactly the ticked boxes through the database function", async () => {
    const rpc = fakeClient();
    expect(await saveNotificationPreferences({}, form({ connect: "on", messages: "on" }))).toEqual({ saved: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("set_notification_preferences", { p_connect: true, p_messages: true });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("saves nothing ticked as everything off", async () => {
    const rpc = fakeClient();
    await saveNotificationPreferences({}, form({}));
    expect(rpc).toHaveBeenCalledWith("set_notification_preferences", { p_connect: false, p_messages: false });
  });

  it("reports a failure without database text", async () => {
    fakeClient({ error: { code: "XX000" } });
    const state = await saveNotificationPreferences({}, form({ messages: "on" }));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain("XX000");
    expect(state.saved).toBeUndefined();
  });
});
