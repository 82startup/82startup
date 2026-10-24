import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const rpc = vi.fn();
const getClaims = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims }, rpc }) }));

const { submitEventRequest, withdrawEventRequest } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

beforeEach(() => {
  for (const fn of [revalidatePath, redirect, rpc, getClaims]) fn.mockReset();
  getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
  rpc.mockResolvedValue({ error: null });
});

describe("submitEventRequest", () => {
  it("sends a visitor to log in", async () => {
    getClaims.mockResolvedValue({ data: null });
    await expect(submitEventRequest({}, form({ link: "https://a.example/e" }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/events/submit");
  });

  it("stores the cleaned link (no tracking parameters), its host and the note", async () => {
    expect(await submitEventRequest({}, form({ link: "https://www.a.example/e/?utm_source=x", note: "  please add  " }))).toEqual({ sent: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("submit_event_request", { p_url: "https://www.a.example/e", p_host: "a.example", p_note: "please add" });
    expect(revalidatePath).toHaveBeenCalledWith("/events/submit");
  });

  it("refuses a bad link or a long note without calling the database", async () => {
    expect(await submitEventRequest({}, form({ link: "http://a.example/e" }))).toEqual({ error: expect.stringContaining("https://") });
    expect(await submitEventRequest({}, form({ link: "https://a.example/e", note: "x".repeat(301) }))).toEqual({ error: expect.stringContaining("300") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains each refusal from the database", async () => {
    const refuse = async (message: string, code: string) => {
      rpc.mockResolvedValueOnce({ error: { message, code } });
      return (await submitEventRequest({}, form({ link: "https://a.example/e" }))).error;
    };
    expect(await refuse("already on the site", "23505")).toMatch(/already on the site/i);
    expect(await refuse("already requested", "23505")).toMatch(/already waiting/i);
    expect(await refuse("too many waiting", "P0001")).toMatch(/3/);
    expect(await refuse("too many today", "P0001")).toMatch(/tomorrow/i);
    expect(await refuse("profile not complete", "42501")).toMatch(/profile/i);
    expect(await refuse("something else", "XX000")).toMatch(/try again/i);
  });
});

describe("withdrawEventRequest", () => {
  it("withdraws a waiting request", async () => {
    expect(await withdrawEventRequest({}, form({ id: ID }))).toEqual({});
    expect(rpc).toHaveBeenCalledExactlyOnceWith("withdraw_event_request", { p_id: ID });
  });

  it("refuses a bad id without calling the database", async () => {
    expect(await withdrawEventRequest({}, form({ id: "nope" }))).toEqual({ error: expect.any(String) });
    expect(rpc).not.toHaveBeenCalled();
  });
});
