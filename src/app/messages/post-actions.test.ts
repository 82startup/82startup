import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { createPost } = await import("./post-actions");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeClient(opts: { sub?: string | null; error?: { code?: string } | null; count?: number } = {}) {
  const rpc = vi.fn(async () => ({ data: [{ post_id: "p1", recipient_count: opts.count ?? 3 }], error: opts.error ?? null }));
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

describe("createPost", () => {
  it("refuses a malformed form without touching the database", async () => {
    const rpc = fakeClient();
    for (const bad of [{}, { body: "  " }, { body: "x".repeat(2001) }] as Record<string, string>[]) {
      expect((await createPost({}, form(bad))).error).toBeTruthy();
    }
    expect(createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends a logged-out caller to the login page and posts nothing", async () => {
    const rpc = fakeClient({ sub: null });
    await expect(createPost({}, form({ body: "hi" }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/messages");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls create_post with the trimmed body and reports how many people it reached", async () => {
    const rpc = fakeClient({ count: 7 });
    const state = await createPost({}, form({ body: "  Big news  " }));
    expect(rpc).toHaveBeenCalledExactlyOnceWith("create_post", { p_body: "Big news" });
    expect(state.error).toBeUndefined();
    expect(state.sentTo).toBe(7);
    expect(state.sentAt).toBeTypeOf("number");
    expect(revalidatePath).toHaveBeenCalledWith("/messages");
  });

  it("words each refusal differently and never shows the database text", async () => {
    const texts = new Set<string | undefined>();
    for (const code of ["P0002", "P0001", "22001", "XX000"]) {
      fakeClient({ error: { code } });
      const state = await createPost({}, form({ body: "hi" }));
      expect(state.error).toBeTruthy();
      expect(state.sentTo).toBeUndefined();
      expect(state.error).not.toContain(code);
      texts.add(state.error);
    }
    expect(texts.size).toBeGreaterThanOrEqual(3);
  });
});
