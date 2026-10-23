import { describe, expect, it, vi } from "vitest";
import { LumaError, READ_PATHS, createLumaClient } from "./client";

function fakeFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Array<{ url: URL; init: RequestInit | undefined }> = [];
  let i = 0;
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), init });
    const r = responses[i++] ?? { status: 500, body: {} };
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const ev = (id: string) => ({ id, platform: "luma" });

describe("createLumaClient", () => {
  it("follows next_cursor until has_more is false and joins the pages", async () => {
    const { fetch, calls } = fakeFetch([
      { body: { entries: [ev("evt-1"), ev("evt-2")], has_more: true, next_cursor: "c1" } },
      { body: { entries: [ev("evt-3")], has_more: false } },
    ]);
    const client = createLumaClient({ apiKey: "k", fetch });
    const events = await client.listCalendarEvents();
    expect(events.map((e) => e.id)).toEqual(["evt-1", "evt-2", "evt-3"]);
    expect(calls[0].url.pathname).toBe("/v1/calendars/events/list");
    expect(calls[0].url.searchParams.get("pagination_cursor")).toBeNull();
    expect(calls[1].url.searchParams.get("pagination_cursor")).toBe("c1");
  });

  it("reads one event by id", async () => {
    const { fetch, calls } = fakeFetch([{ body: { id: "evt-1", description: "Hello" } }]);
    const detail = await createLumaClient({ apiKey: "k", fetch }).getEvent("evt-1");
    expect(detail.description).toBe("Hello");
    expect(calls[0].url.pathname).toBe("/v1/events/get");
    expect(calls[0].url.searchParams.get("event_id")).toBe("evt-1");
  });

  it("only ever sends GET with the API key header, to the two read paths", async () => {
    const { fetch, calls } = fakeFetch([
      { body: { entries: [], has_more: false } },
      { body: { id: "evt-1" } },
    ]);
    const client = createLumaClient({ apiKey: "secret-key", fetch });
    await client.listCalendarEvents();
    await client.getEvent("evt-1");
    for (const { url, init } of calls) {
      expect(init?.method).toBe("GET");
      expect(init?.body).toBeUndefined();
      expect((init?.headers as Record<string, string>)["x-luma-api-key"]).toBe("secret-key");
      expect(url.origin).toBe("https://public-api.luma.com");
      expect(READ_PATHS).toContain(url.pathname);
    }
    expect([...READ_PATHS].sort()).toEqual(["/v1/calendars/events/list", "/v1/events/get"]);
  });

  it("throws a LumaError with the status on 401, 403 and 429, without retrying", async () => {
    for (const status of [401, 403, 429]) {
      const { fetch, calls } = fakeFetch([{ status, body: { message: "no" } }]);
      await expect(createLumaClient({ apiKey: "k", fetch }).listCalendarEvents()).rejects.toMatchObject({
        name: "LumaError",
        status,
      });
      expect(calls).toHaveLength(1);
    }
  });

  it("never puts the API key in an error message", async () => {
    const { fetch } = fakeFetch([{ status: 401, body: {} }]);
    const error = await createLumaClient({ apiKey: "secret-key", fetch }).listCalendarEvents().catch((e) => e);
    expect(error).toBeInstanceOf(LumaError);
    expect(error.message).not.toContain("secret-key");
  });

  it("stops with an error if the listing never ends", async () => {
    const endless = Array.from({ length: 60 }, () => ({ body: { entries: [], has_more: true, next_cursor: "again" } }));
    const { fetch } = fakeFetch(endless);
    await expect(createLumaClient({ apiKey: "k", fetch }).listCalendarEvents()).rejects.toThrow(/pages/);
  });

  it("rejects a response that is not the expected shape", async () => {
    const { fetch } = fakeFetch([{ body: { nope: true } }]);
    await expect(createLumaClient({ apiKey: "k", fetch }).listCalendarEvents()).rejects.toThrow(/unexpected/i);
  });
});
