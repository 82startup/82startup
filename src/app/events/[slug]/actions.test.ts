import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const createClient = vi.fn();

vi.mock("next/cache", () => ({ updateTag, revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const { setAttending, setListVisibility } = await import("./actions");

const ID = "11111111-2222-3333-4444-555555555555";
const SLUG = "ai-founders-meetup-a1b2c3d4";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function fakeClient(opts: { sub?: string | null; rpc?: { error: unknown } } = {}) {
  const rpc = vi.fn(async () => opts.rpc ?? { data: "registered", error: null });
  const client = {
    auth: { getClaims: vi.fn(async () => ({ data: "sub" in opts && opts.sub === null ? null : { claims: { sub: opts.sub ?? "user-1" } } })) },
    rpc,
  };
  createClient.mockResolvedValue(client);
  return { client, rpc };
}

beforeEach(() => {
  for (const fn of [updateTag, revalidatePath, redirect, createClient]) fn.mockReset();
  redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe.each([
  ["setAttending", setAttending, "set_attendance", { p_event: ID, p_attending: true }, { p_event: ID, p_attending: false }],
  ["setListVisibility", setListVisibility, "set_list_visibility", { p_event: ID, p_show: true }, { p_event: ID, p_show: false }],
] as const)("%s", (_name, action, fn, argsTrue, argsFalse) => {
  it("refuses a malformed form without touching the database", async () => {
    const { rpc } = fakeClient();
    const bads: Record<string, string>[] = [{ id: "nope", slug: SLUG, value: "true" }, { id: ID, slug: "../x", value: "true" }, { id: ID, slug: SLUG, value: "maybe" }, {}];
    for (const bad of bads) expect((await action({}, form(bad))).error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends a logged-out caller to the login page for this event, and changes nothing", async () => {
    const { rpc } = fakeClient({ sub: null });
    await expect(action({}, form({ id: ID, slug: SLUG, value: "true" }))).rejects.toThrow(`NEXT_REDIRECT:/login?next=/events/${SLUG}`);
    expect(rpc).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("calls its own database function with the event and the value, then refreshes the count and the page", async () => {
    const { rpc } = fakeClient();
    expect(await action({}, form({ id: ID, slug: SLUG, value: "true" }))).toEqual({});
    expect(rpc).toHaveBeenCalledWith(fn, argsTrue);
    expect(updateTag).toHaveBeenCalledWith(`attendance-${ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${SLUG}`);
  });

  it("can switch off as well as on", async () => {
    const { rpc } = fakeClient();
    await action({}, form({ id: ID, slug: SLUG, value: "false" }));
    expect(rpc).toHaveBeenCalledWith(fn, argsFalse);
  });

  it("reports a generic error, never the database message, and refreshes nothing when the call fails", async () => {
    fakeClient({ rpc: { error: { message: "event is not open (secret detail)" } } });
    const result = await action({}, form({ id: ID, slug: SLUG, value: "true" }));
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("secret detail");
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
