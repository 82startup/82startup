import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { setDirectoryVisibility } = await import("./actions");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeClient(opts: { sub?: string | null; updated?: unknown } = {}) {
  const update = vi.fn();
  const eq = vi.fn();
  const chain = { eq, select: () => chain, maybeSingle: async () => ({ data: "updated" in opts ? opts.updated : { id: "user-1" }, error: null }) };
  eq.mockReturnValue(chain);
  update.mockReturnValue(chain);
  createClient.mockResolvedValue({
    auth: { getClaims: vi.fn(async () => ({ data: "sub" in opts && opts.sub === null ? null : { claims: { sub: opts.sub ?? "user-1" } } })) },
    from: () => ({ update }),
  });
  return { update, eq };
}

beforeEach(() => {
  for (const fn of [revalidatePath, redirect, createClient]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("setDirectoryVisibility", () => {
  it("sends a logged-out caller to the login page and changes nothing", async () => {
    const { update } = fakeClient({ sub: null });
    await expect(setDirectoryVisibility({}, form({ show_in_directory: "on" }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/settings");
    expect(update).not.toHaveBeenCalled();
  });

  it("changes only the caller's own row and only the one column", async () => {
    const { update, eq } = fakeClient({ sub: "user-7" });
    expect(await setDirectoryVisibility({}, form({ show_in_directory: "on" }))).toEqual({ saved: true });
    expect(update).toHaveBeenCalledExactlyOnceWith({ show_in_directory: true });
    expect(eq).toHaveBeenCalledWith("id", "user-7");
    await setDirectoryVisibility({}, form({}));
    expect(update).toHaveBeenLastCalledWith({ show_in_directory: false });
  });

  it("refreshes the directory and member pages after a save", async () => {
    fakeClient();
    await setDirectoryVisibility({}, form({ show_in_directory: "on" }));
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/members", "layout");
  });

  it("reports a failure without showing database text", async () => {
    fakeClient({ updated: null });
    const state = await setDirectoryVisibility({}, form({ show_in_directory: "on" }));
    expect(state.error).toBeTruthy();
    expect(state.saved).toBeUndefined();
  });
});
