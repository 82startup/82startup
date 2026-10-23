import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runSync = vi.fn();
vi.mock("./sync", () => ({ runSync }));
vi.mock("./client", () => ({ createLumaClient: vi.fn(() => ({ fake: "luma" })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ fake: "db" })) }));
vi.mock("@/lib/events/store", () => ({ createEventStore: vi.fn(() => ({ fake: "store" })) }));

const { MissingConfigError, runLumaSync } = await import("./run");

describe("runLumaSync", () => {
  beforeEach(() => runSync.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("rejects with MissingConfigError and does not sync when LUMA_API_KEY is not set", async () => {
    vi.stubEnv("LUMA_API_KEY", "");
    const error = await runLumaSync().catch((e) => e);
    expect(error).toBeInstanceOf(MissingConfigError);
    expect(error.name).toBe("MissingConfigError");
    expect(runSync).not.toHaveBeenCalled();
  });

  it("runs the sync once and returns its counts", async () => {
    vi.stubEnv("LUMA_API_KEY", "luma-key");
    runSync.mockResolvedValue({ created: 1, updated: 2, removed: 0, errors: 0 });
    await expect(runLumaSync()).resolves.toEqual({ created: 1, updated: 2, removed: 0, errors: 0 });
    expect(runSync).toHaveBeenCalledTimes(1);
  });
});
