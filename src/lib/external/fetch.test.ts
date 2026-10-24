import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { fetchEventPage, guardedLookup, type RequestFn } from "./fetch";

type Reply = { status?: number; headers?: Record<string, string>; body?: string | Buffer; delay?: boolean; error?: boolean };

// A stand-in for node:https.request that answers from a table of replies and records what was asked.
function fakeRequest(replies: Record<string, Reply>) {
  const calls: { url: string; headers: Record<string, string | string[] | number | undefined> }[] = [];
  const request: RequestFn = (url, options, callback) => {
    calls.push({ url: String(url), headers: (options.headers ?? {}) as Record<string, string | string[] | number | undefined> });
    const req = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
    req.destroy = () => {};
    req.end = () => {
      const reply = replies[String(url)];
      if (!reply || reply.error) {
        setTimeout(() => req.emit("error", new Error("connect ECONNREFUSED")), 0);
        return;
      }
      if (reply.delay) return; // never answers
      const res = Readable.from([reply.body ?? ""]) as Readable & { statusCode: number; headers: Record<string, string> };
      res.statusCode = reply.status ?? 200;
      res.headers = { "content-type": "text/html; charset=utf-8", ...reply.headers };
      callback(res as never);
    };
    return req as never;
  };
  return { request, calls };
}

const PAGE = "https://events.example.com/e/1";

describe("fetchEventPage", () => {
  it("returns the HTML of a page and the address it ended at", async () => {
    const { request } = fakeRequest({ [PAGE]: { body: "<html>hello</html>" } });
    expect(await fetchEventPage(PAGE, { request })).toEqual({ ok: true, html: "<html>hello</html>", finalUrl: PAGE });
  });

  it("sends no cookies or keys and says plainly who is asking, and asks for the text as it is (no compression)", async () => {
    const { request, calls } = fakeRequest({ [PAGE]: { body: "x" } });
    await fetchEventPage(PAGE, { request });
    const headers = Object.fromEntries(Object.entries(calls[0].headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
    expect(headers["user-agent"]).toMatch(/82 Startup/);
    expect(headers["accept-encoding"]).toBe("identity");
    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(headers["x-luma-api-key"]).toBeUndefined();
  });

  it("follows up to 3 redirects, checking every address, and refuses more", async () => {
    const hop = (n: number) => `https://events.example.com/r${n}`;
    const redirects = Object.fromEntries([1, 2, 3].map((n) => [hop(n), { status: 302, headers: { location: n === 3 ? "/final" : hop(n + 1) } }]));
    const { request } = fakeRequest({ ...redirects, "https://events.example.com/final": { body: "ok" } });
    expect(await fetchEventPage(hop(1), { request })).toMatchObject({ ok: true, finalUrl: "https://events.example.com/final" });
    const loop = fakeRequest({ ...redirects, [hop(3)]: { status: 302, headers: { location: hop(4) } }, [hop(4)]: { status: 302, headers: { location: hop(5) } } });
    expect(await fetchEventPage(hop(1), { request: loop.request })).toEqual({ ok: false, reason: "redirects" });
  });

  it("refuses a redirect to a private or non-https address, even when the first address was fine", async () => {
    for (const target of ["https://localhost/admin", "https://127.0.0.1/", "https://169.254.169.254/latest/meta-data", "http://events.example.com/plain", "https://[::1]/", "https://10.0.0.5:8443/"]) {
      const { request, calls } = fakeRequest({ [PAGE]: { status: 301, headers: { location: target } } });
      expect(await fetchEventPage(PAGE, { request })).toEqual({ ok: false, reason: "blocked" });
      expect(calls).toHaveLength(1); // the forbidden address was never contacted
    }
  });

  it("refuses an address that is not https or has credentials before asking anything", async () => {
    const { request, calls } = fakeRequest({});
    for (const bad of ["http://events.example.com/e", "https://user:pw@events.example.com/e", "https://localhost/e", "https://192.168.1.1/e"]) {
      expect(await fetchEventPage(bad, { request })).toEqual({ ok: false, reason: "blocked" });
    }
    expect(calls).toEqual([]);
  });

  it("gives up on a page that never answers, within the time limit", async () => {
    const { request } = fakeRequest({ [PAGE]: { delay: true } });
    expect(await fetchEventPage(PAGE, { request, timeoutMs: 30 })).toEqual({ ok: false, reason: "timeout" });
  });

  it("refuses a page over the size limit, and accepts one exactly at it", async () => {
    const big = fakeRequest({ [PAGE]: { body: "x".repeat(101) } });
    expect(await fetchEventPage(PAGE, { request: big.request, maxBytes: 100 })).toEqual({ ok: false, reason: "too_large" });
    const edge = fakeRequest({ [PAGE]: { body: "x".repeat(100) } });
    expect(await fetchEventPage(PAGE, { request: edge.request, maxBytes: 100 })).toMatchObject({ ok: true });
  });

  it("reads only HTML answers", async () => {
    for (const type of ["application/pdf", "image/png", "application/json", "text/plain"]) {
      const { request } = fakeRequest({ [PAGE]: { headers: { "content-type": type }, body: "x" } });
      expect(await fetchEventPage(PAGE, { request })).toEqual({ ok: false, reason: "not_html" });
    }
    const xhtml = fakeRequest({ [PAGE]: { headers: { "content-type": "application/xhtml+xml" }, body: "<html/>" } });
    expect(await fetchEventPage(PAGE, { request: xhtml.request })).toMatchObject({ ok: true });
  });

  it("reports an error status or a failed connection with a plain reason, never the text of the answer", async () => {
    expect(await fetchEventPage(PAGE, { request: fakeRequest({ [PAGE]: { status: 404, body: "secret page text" } }).request })).toEqual({ ok: false, reason: "status" });
    expect(await fetchEventPage(PAGE, { request: fakeRequest({ [PAGE]: { error: true } }).request })).toEqual({ ok: false, reason: "network" });
    expect(await fetchEventPage(PAGE, { request: fakeRequest({}).request })).toEqual({ ok: false, reason: "network" });
  });
});

describe("guardedLookup", () => {
  const run = (addresses: string[], family = 4) => {
    const dns = vi.fn((_host: string, _opts: unknown, cb: (err: Error | null, a: { address: string; family: number }[]) => void) =>
      cb(null, addresses.map((address) => ({ address, family: address.includes(":") ? 6 : family }))),
    );
    return new Promise<{ error: Error | null; address?: unknown }>((resolve) => {
      guardedLookup("events.example.com", { family: 0 }, (error, address) => resolve({ error, address }), dns as never);
    });
  };

  it("passes on a public address", async () => {
    const result = await run(["8.8.8.8"]);
    expect(result.error).toBeNull();
    expect(JSON.stringify(result.address)).toContain("8.8.8.8");
  });

  it("refuses when the name points to a private address, even if another answer is public", async () => {
    for (const set of [["127.0.0.1"], ["10.1.2.3"], ["169.254.169.254"], ["8.8.8.8", "192.168.0.10"], ["::1"], ["fe80::1"]]) {
      const result = await run(set);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("blocked");
    }
  });
});
