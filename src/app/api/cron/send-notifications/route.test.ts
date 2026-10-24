import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runNotifications = vi.fn();
vi.mock("@/lib/notifications/run", () => ({ runNotifications }));

const { GET } = await import("./route");

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/send-notifications", { headers: authorization ? { authorization } : {} });

describe("GET /api/cron/send-notifications", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    runNotifications.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("answers 500 when CRON_SECRET is not set, and 401 without or with a wrong header, doing nothing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer s3cret"))).status).toBe(500);
    vi.stubEnv("CRON_SECRET", "s3cret");
    for (const header of [undefined, "Bearer wrong", "s3cret"]) expect((await GET(request(header))).status).toBe(401);
    expect(runNotifications).not.toHaveBeenCalled();
  });

  it("runs the job and returns its counts", async () => {
    runNotifications.mockResolvedValue({ configured: true, sent: 2, skipped: 1, retried: 0 });
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: true, sent: 2, skipped: 1, retried: 0 });
  });

  it("answers 502 without details when the job fails", async () => {
    runNotifications.mockRejectedValue(new Error("secret detail bo@x.test"));
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("bo@x.test");
  });
});
