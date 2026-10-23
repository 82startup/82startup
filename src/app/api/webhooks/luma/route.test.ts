import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const runLumaRefresh = vi.fn();
const runLumaCancel = vi.fn();
const jobs: Array<() => unknown> = [];
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("next/server", () => ({ after: (job: () => unknown) => jobs.push(job) }));
vi.mock("@/lib/luma/run", () => ({
  runLumaRefresh,
  runLumaCancel,
  MissingConfigError: class MissingConfigError extends Error {},
}));

const { POST } = await import("./route");

const SECRET = "whsec_route_secret";
const bodyOf = (type: string, data: unknown) => JSON.stringify({ type, data });
const signed = (body: string, over: { secret?: string; ts?: number } = {}) => {
  const ts = over.ts ?? Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", over.secret ?? SECRET).update(`${ts}.${body}`).digest("hex");
  return new Request("http://localhost/api/webhooks/luma", {
    method: "POST",
    body,
    headers: { "webhook-id": "msg_1", "webhook-timestamp": String(ts), "webhook-signature": `t=${ts},v1=${sig}` },
  });
};
const runJobs = async () => {
  for (const job of jobs.splice(0)) await job();
};

describe("POST /api/webhooks/luma", () => {
  beforeEach(() => {
    vi.stubEnv("LUMA_WEBHOOK_SECRET", SECRET);
    for (const fn of [revalidateTag, runLumaRefresh, runLumaCancel]) fn.mockReset();
    jobs.length = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("answers 500 and does nothing when the secret is not configured", async () => {
    vi.stubEnv("LUMA_WEBHOOK_SECRET", "");
    const res = await POST(signed(bodyOf("event.updated", { id: "evt-a1" })));
    expect(res.status).toBe(500);
    expect(jobs).toEqual([]);
  });

  it("answers 401 for a wrong secret, an old timestamp or no signature, and does nothing", async () => {
    const body = bodyOf("event.updated", { id: "evt-a1" });
    const bare = new Request("http://localhost/api/webhooks/luma", { method: "POST", body });
    for (const req of [signed(body, { secret: "whsec_other" }), signed(body, { ts: 1000 }), bare]) {
      expect((await POST(req)).status).toBe(401);
    }
    await runJobs();
    expect(runLumaRefresh).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 413 for a body over 1 MB and does nothing", async () => {
    const res = await POST(signed(bodyOf("event.updated", { id: "evt-a1", pad: "x".repeat(1_048_577) })));
    expect(res.status).toBe(413);
    expect(jobs).toEqual([]);
  });

  it("answers 200 at once, then refreshes exactly the right event and expires the events cache", async () => {
    runLumaRefresh.mockResolvedValue({});
    const res = await POST(signed(bodyOf("guest.registered", { event: { id: "evt-g9" } })));
    expect(res.status).toBe(200);
    expect(runLumaRefresh).not.toHaveBeenCalled();
    expect(jobs).toHaveLength(1);
    await runJobs();
    expect(runLumaRefresh).toHaveBeenCalledExactlyOnceWith("evt-g9");
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith("events", { expire: 0 });
  });

  it("cancels, not refreshes, for event.canceled", async () => {
    runLumaCancel.mockResolvedValue(1);
    await POST(signed(bodyOf("event.canceled", { id: "evt-c3" })));
    await runJobs();
    expect(runLumaCancel).toHaveBeenCalledExactlyOnceWith("evt-c3");
    expect(runLumaRefresh).not.toHaveBeenCalled();
  });

  it("answers 200 and schedules nothing for unknown types, bad JSON and bad ids", async () => {
    for (const body of [bodyOf("ticket.created", { id: "evt-a1" }), "not json", bodyOf("event.updated", { id: "nope" })]) {
      expect((await POST(signed(body))).status).toBe(200);
    }
    expect(jobs).toEqual([]);
  });

  it("keeps answering 200 when the refresh fails, logging the kind only", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    runLumaRefresh.mockImplementation(async () => {
      throw new Error("boom x@secret.test");
    });
    const res = await POST(signed(bodyOf("event.updated", { id: "evt-a1" })));
    expect(res.status).toBe(200);
    await runJobs();
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret.test");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
