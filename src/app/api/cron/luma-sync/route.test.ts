import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const runSync = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/luma/sync", () => ({ runSync }));
vi.mock("@/lib/luma/client", () => ({ createLumaClient: vi.fn(() => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/events/store", () => ({ createEventStore: vi.fn(() => ({})) }));

const { GET } = await import("./route");

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/luma-sync", { headers: authorization ? { authorization } : {} });

describe("GET /api/cron/luma-sync", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("LUMA_API_KEY", "luma-key");
    runSync.mockReset();
    revalidateTag.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("answers 500 and does nothing when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(runSync).not.toHaveBeenCalled();
  });

  it("answers 401 without the header or with a wrong one, and does nothing", async () => {
    for (const header of [undefined, "Bearer wrong", "s3cret", "Bearer s3cret2"]) {
      const res = await GET(request(header));
      expect(res.status).toBe(401);
    }
    expect(runSync).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 500 and does nothing when LUMA_API_KEY is not set", async () => {
    vi.stubEnv("LUMA_API_KEY", "");
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(runSync).not.toHaveBeenCalled();
  });

  it("runs the sync, refreshes the events cache and returns the counts", async () => {
    runSync.mockResolvedValue({ created: 2, updated: 1, removed: 0, errors: 0 });
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: 2, updated: 1, removed: 0, errors: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("events", "max");
  });

  it("answers 502 with no details and does not refresh the cache when the sync throws", async () => {
    runSync.mockRejectedValue(new Error("Luma request failed with luma-key inside"));
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("luma-key");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
