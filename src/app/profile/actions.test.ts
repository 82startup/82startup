import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { updateProfile } = await import("./actions");

const GOOD = { name: "Ada", job_title: "CEO", company_name: "Acme", member_type: "startup" };
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeClient(opts: { sub?: string | null; updated?: unknown } = {}) {
  const update = vi.fn();
  const chain = { eq: () => chain, select: () => chain, maybeSingle: async () => ({ data: "updated" in opts ? opts.updated : { id: "user-1" }, error: null }) };
  update.mockReturnValue(chain);
  createClient.mockResolvedValue({
    auth: { getClaims: vi.fn(async () => ({ data: "sub" in opts && opts.sub === null ? null : { claims: { sub: opts.sub ?? "user-1" } } })) },
    from: () => ({ update }),
  });
  return update;
}

beforeEach(() => {
  for (const fn of [revalidatePath, redirect, createClient]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("updateProfile", () => {
  it("refuses a save with a required field empty and writes nothing", async () => {
    const update = fakeClient();
    for (const field of ["member_type", "name", "job_title", "company_name"]) {
      const state = await updateProfile({}, form({ ...GOOD, [field]: "" }));
      expect(state.errors?.[field as "name"]).toBeTruthy();
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("sends a logged-out caller to the login page", async () => {
    fakeClient({ sub: null });
    await expect(updateProfile({}, form(GOOD))).rejects.toThrow("NEXT_REDIRECT:/login?next=/profile");
  });

  it("saves and stays on the page for a normal edit", async () => {
    const update = fakeClient();
    expect(await updateProfile({}, form(GOOD))).toEqual({ saved: true });
    expect(update).toHaveBeenCalledOnce();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("in setup mode saves and goes on to the remembered page", async () => {
    fakeClient();
    await expect(updateProfile({}, form({ ...GOOD, setup: "1", next: "/events/summit-abc?x=1" }))).rejects.toThrow("NEXT_REDIRECT:/events/summit-abc?x=1");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("in setup mode falls back to the home page for an unsafe or looping address", async () => {
    for (const next of ["https://evil.example", "//evil.example", "/profile", "/profile?next=/x", "", "javascript:alert(1)"]) {
      fakeClient();
      await expect(updateProfile({}, form({ ...GOOD, setup: "1", next }))).rejects.toThrow("NEXT_REDIRECT:/");
    }
  });

  it("reports a save failure without redirecting", async () => {
    fakeClient({ updated: null });
    const state = await updateProfile({}, form({ ...GOOD, setup: "1", next: "/events" }));
    expect(state.errors?.save).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
