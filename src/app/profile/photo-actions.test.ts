import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { removeAvatar, setAvatar } = await import("./photo-actions");

const BASE = "https://proj.supabase.co";
const UID = "11111111-2222-3333-4444-555555555555";
const NEW_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OLD_ID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const NEW_PATH = `${UID}/${NEW_ID}.jpg`;
const OLD_PATH = `${UID}/${OLD_ID}.jpg`;
const publicUrl = (path: string) => `${BASE}/storage/v1/object/public/avatars/${path}`;

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeSupabase(opts: { sub?: string | null; current?: string | null; updateResult?: { data?: unknown; error?: unknown } } = {}) {
  const log = { updates: [] as unknown[], removed: [] as string[][], fromCalls: 0 };
  const makeChain = () => {
    let mode: "select" | "update" = "select";
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.update = vi.fn((payload: unknown) => {
      mode = "update";
      log.updates.push(payload);
      return chain;
    });
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () =>
      mode === "update" ? (opts.updateResult ?? { data: { id: UID }, error: null }) : { data: { avatar_url: opts.current ?? null }, error: null },
    );
    return chain;
  };
  const supabase = {
    auth: { getClaims: vi.fn(async () => ({ data: "sub" in opts && opts.sub === null ? null : { claims: { sub: opts.sub ?? UID } } })) },
    from: vi.fn(() => {
      log.fromCalls++;
      return makeChain();
    }),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(async (paths: string[]) => {
          log.removed.push(paths);
          return { error: null };
        }),
      })),
    },
  };
  createClient.mockResolvedValue(supabase);
  return { supabase, log };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE);
  for (const fn of [revalidatePath, createClient]) fn.mockReset();
  redirect.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("setAvatar", () => {
  it("sends a logged-out caller to the login page and changes nothing", async () => {
    const { log } = fakeSupabase({ sub: null });
    await expect(setAvatar({}, form({ path: NEW_PATH }))).rejects.toThrow("NEXT_REDIRECT:/login?next=/profile");
    expect(log.fromCalls).toBe(0);
    expect(log.removed).toEqual([]);
  });

  it("refuses a path that is not the caller's own, and touches nothing", async () => {
    const { log } = fakeSupabase();
    const bad = [
      `99999999-2222-3333-4444-555555555555/${NEW_ID}.jpg`,
      `${UID}/../${NEW_ID}.jpg`,
      `${UID}/sub/${NEW_ID}.jpg`,
      `${UID}/${NEW_ID}.png`,
      `${UID}/photo.jpg`,
      "",
    ];
    for (const path of bad) expect((await setAvatar({}, form({ path }))).error).toBeTruthy();
    expect(log.fromCalls).toBe(0);
    expect(log.removed).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("records the public address, deletes the previous uploaded photo and refreshes the page", async () => {
    const { log } = fakeSupabase({ current: publicUrl(OLD_PATH) });
    expect(await setAvatar({}, form({ path: NEW_PATH }))).toEqual({ saved: true });
    expect(log.updates).toEqual([{ avatar_url: publicUrl(NEW_PATH) }]);
    expect(log.removed).toEqual([[OLD_PATH]]);
    expect(revalidatePath).toHaveBeenCalledWith("/profile");
  });

  it("deletes nothing when the previous picture was Google's or there was none", async () => {
    for (const current of ["https://lh3.googleusercontent.com/a/x", null]) {
      const { log } = fakeSupabase({ current });
      expect(await setAvatar({}, form({ path: NEW_PATH }))).toEqual({ saved: true });
      expect(log.removed).toEqual([]);
    }
  });

  it("does not delete the file it has just saved when the address is unchanged", async () => {
    const { log } = fakeSupabase({ current: publicUrl(NEW_PATH) });
    await setAvatar({}, form({ path: NEW_PATH }));
    expect(log.removed).toEqual([]);
  });

  it("removes the new file again, returns a generic error and refreshes nothing when recording fails", async () => {
    const { log } = fakeSupabase({ current: publicUrl(OLD_PATH), updateResult: { data: null, error: { message: "secret database detail" } } });
    const result = await setAvatar({}, form({ path: NEW_PATH }));
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("secret");
    expect(log.removed).toEqual([[NEW_PATH]]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("treats an update that matched no row as a failure too", async () => {
    const { log } = fakeSupabase({ updateResult: { data: null, error: null } });
    expect((await setAvatar({}, form({ path: NEW_PATH }))).error).toBeTruthy();
    expect(log.removed).toEqual([[NEW_PATH]]);
  });
});

describe("removeAvatar", () => {
  it("sends a logged-out caller to the login page", async () => {
    const { log } = fakeSupabase({ sub: null });
    await expect(removeAvatar()).rejects.toThrow("NEXT_REDIRECT:/login?next=/profile");
    expect(log.fromCalls).toBe(0);
  });

  it("clears the address and deletes the file when it is one of ours", async () => {
    const { log } = fakeSupabase({ current: publicUrl(OLD_PATH) });
    expect(await removeAvatar()).toEqual({ saved: true });
    expect(log.updates).toEqual([{ avatar_url: null }]);
    expect(log.removed).toEqual([[OLD_PATH]]);
    expect(revalidatePath).toHaveBeenCalledWith("/profile");
  });

  it("clears a Google picture without touching storage", async () => {
    const { log } = fakeSupabase({ current: "https://lh3.googleusercontent.com/a/x" });
    expect(await removeAvatar()).toEqual({ saved: true });
    expect(log.updates).toEqual([{ avatar_url: null }]);
    expect(log.removed).toEqual([]);
  });

  it("does not delete the file, and reports an error, when clearing the address fails", async () => {
    const { log } = fakeSupabase({ current: publicUrl(OLD_PATH), updateResult: { data: null, error: { message: "boom" } } });
    const result = await removeAvatar();
    expect(result.error).toBeTruthy();
    expect(log.removed).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
