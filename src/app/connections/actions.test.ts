import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();
const triggerNotifications = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/notifications/trigger", () => ({ triggerNotifications }));

const { sendConnectionRequest, respondToRequest, cancelRequest, disconnect, blockMember, unblockMember } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeClient(opts: { sub?: string | null; error?: { code?: string } | null } = {}) {
  const rpc = vi.fn(async () => ({ data: "pending", error: opts.error ?? null }));
  createClient.mockResolvedValue({
    auth: { getClaims: vi.fn(async () => ({ data: "sub" in opts && opts.sub === null ? null : { claims: { sub: opts.sub ?? "user-1" } } })) },
    rpc,
  });
  return rpc;
}

beforeEach(() => {
  for (const fn of [revalidatePath, redirect, createClient, triggerNotifications]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe.each([
  ["sendConnectionRequest", sendConnectionRequest, "send_connection_request", { member: ID, note: "hi" }, { p_addressee: ID, p_note: "hi" }],
  ["respondToRequest", respondToRequest, "respond_connection_request", { id: ID, value: "true" }, { p_id: ID, p_accept: true }],
  ["cancelRequest", cancelRequest, "cancel_connection_request", { id: ID }, { p_id: ID }],
  ["disconnect", disconnect, "remove_connection", { member: ID }, { p_member: ID }],
  ["blockMember", blockMember, "block_member", { member: ID }, { p_member: ID }],
  ["unblockMember", unblockMember, "unblock_member", { member: ID }, { p_member: ID }],
] as const)("%s", (_name, action, fn, input, args) => {
  it("refuses a malformed form without touching the database", async () => {
    const rpc = fakeClient();
    expect((await action({}, form({ member: "nope", id: "nope", value: "x" }))).error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends a logged-out caller to the login page and changes nothing", async () => {
    const rpc = fakeClient({ sub: null });
    await expect(action({}, form(input))).rejects.toThrow("NEXT_REDIRECT:/login?next=/connections");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls its own database function with the right arguments, then refreshes the pages", async () => {
    const rpc = fakeClient();
    expect(await action({}, form(input))).toEqual({});
    expect(rpc).toHaveBeenCalledExactlyOnceWith(fn, args);
    expect(revalidatePath).toHaveBeenCalledWith("/connections");
  });

  it("answers with a message, never the database text, when the database refuses", async () => {
    fakeClient({ error: { code: "XX000" } });
    const state = await action({}, form(input));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toMatch(/XX000/);
  });
});

describe("sendConnectionRequest messages", () => {
  it("tells the sender to wait when asked again too soon, and that a member is unavailable otherwise", async () => {
    fakeClient({ error: { code: "P0001" } });
    const wait = (await sendConnectionRequest({}, form({ member: ID }))).error;
    fakeClient({ error: { code: "P0002" } });
    const gone = (await sendConnectionRequest({}, form({ member: ID }))).error;
    expect(wait).toBeTruthy();
    expect(gone).toBeTruthy();
    expect(wait).not.toBe(gone);
  });
});

describe("respondToRequest value", () => {
  it("declines when the value is false, and refuses any other value", async () => {
    const rpc = fakeClient();
    await respondToRequest({}, form({ id: ID, value: "false" }));
    expect(rpc).toHaveBeenCalledWith("respond_connection_request", { p_id: ID, p_accept: false });
    rpc.mockClear();
    expect((await respondToRequest({}, form({ id: ID, value: "maybe" }))).error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("sending notifications after an action", () => {
  it("starts the email run after a request and after an answer, but not after cancel, disconnect or block", async () => {
    fakeClient();
    await sendConnectionRequest({}, form({ member: ID, note: "hi" }));
    await respondToRequest({}, form({ id: ID, value: "true" }));
    expect(triggerNotifications).toHaveBeenCalledTimes(2);
    await cancelRequest({}, form({ id: ID }));
    await disconnect({}, form({ member: ID }));
    await blockMember({}, form({ member: ID }));
    await unblockMember({}, form({ member: ID }));
    expect(triggerNotifications).toHaveBeenCalledTimes(2);
  });

  it("does not start it when the database refuses", async () => {
    fakeClient({ error: { code: "P0002" } });
    await sendConnectionRequest({}, form({ member: ID }));
    expect(triggerNotifications).not.toHaveBeenCalled();
  });
});
