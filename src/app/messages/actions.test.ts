import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { sendMessage, markConversationRead } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeClient(opts: { sub?: string | null; error?: { code?: string } | null } = {}) {
  const rpc = vi.fn(async () => ({ data: "id", error: opts.error ?? null }));
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

describe("sendMessage", () => {
  it("refuses a malformed form without touching the database", async () => {
    const rpc = fakeClient();
    const bads: Record<string, string>[] = [{}, { member: "nope", body: "hi" }, { member: ID, body: "  " }, { member: ID, body: "x".repeat(2001) }];
    for (const bad of bads) {
      expect((await sendMessage({}, form(bad))).error).toBeTruthy();
    }
    expect(createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends a logged-out caller to the login page for this conversation and sends nothing", async () => {
    const rpc = fakeClient({ sub: null });
    await expect(sendMessage({}, form({ member: ID, body: "hi" }))).rejects.toThrow(`NEXT_REDIRECT:/login?next=/messages/${ID}`);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls send_message with the member and the trimmed body, refreshes the pages and reports it was sent", async () => {
    const rpc = fakeClient();
    const state = await sendMessage({}, form({ member: ID, body: "  hello  " }));
    expect(rpc).toHaveBeenCalledExactlyOnceWith("send_message", { p_to: ID, p_body: "hello" });
    expect(state.error).toBeUndefined();
    expect(state.sentAt).toBeTypeOf("number");
    expect(revalidatePath).toHaveBeenCalledWith(`/messages/${ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/messages");
  });

  it("words each refusal differently and never shows the database text", async () => {
    const texts = new Set<string | undefined>();
    for (const code of ["P0002", "P0001", "22001", "22023", "XX000"]) {
      fakeClient({ error: { code } });
      const state = await sendMessage({}, form({ member: ID, body: "hi" }));
      expect(state.error).toBeTruthy();
      expect(state.sentAt).toBeUndefined();
      expect(state.error).not.toContain(code);
      texts.add(state.error);
    }
    expect(texts.size).toBeGreaterThanOrEqual(3);
  });
});

describe("markConversationRead", () => {
  it("ignores a bad id, and for a good one calls mark_conversation_read", async () => {
    const rpc = fakeClient();
    await markConversationRead(form({ member: "nope" }));
    expect(rpc).not.toHaveBeenCalled();
    await markConversationRead(form({ member: ID }));
    expect(rpc).toHaveBeenCalledExactlyOnceWith("mark_conversation_read", { p_with: ID });
  });

  it("does nothing for a logged-out caller", async () => {
    const rpc = fakeClient({ sub: null });
    await markConversationRead(form({ member: ID }));
    expect(rpc).not.toHaveBeenCalled();
  });
});
