import dns from "node:dns";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import { isPublicIp } from "./ip";
import { normalizeEventUrl } from "./url";

export type RequestFn = (url: string | URL, options: https.RequestOptions, callback: (res: IncomingMessage) => void) => ReturnType<typeof https.request>;
export type PageResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; reason: "blocked" | "timeout" | "too_large" | "not_html" | "status" | "network" | "redirects" };

const DEFAULTS = { timeoutMs: 5000, maxBytes: 2 * 1024 * 1024, maxRedirects: 3 };
const USER_AGENT = "82 Startup event reader (+https://82startup.vercel.app)";

type DnsLookup = (hostname: string, options: dns.LookupAllOptions, callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void) => void;

// The lookup the connection itself uses: the name is resolved once, every address it points to must be public, and the connection is made
// to that very address. So a name that points (or is switched) to a private address is refused, and a redirect cannot get around it.
export function guardedLookup(
  hostname: string,
  options: { family?: number | string; all?: boolean },
  callback: (err: Error | null, address?: string | dns.LookupAddress[], family?: number) => void,
  lookup: DnsLookup = dns.lookup as unknown as DnsLookup,
): void {
  lookup(hostname, { all: true, family: Number(options.family) || 0 } as dns.LookupAllOptions, (error, addresses) => {
    if (error || !addresses || addresses.length === 0) return callback(new Error("lookup failed"));
    if (!addresses.every((entry) => isPublicIp(entry.address))) return callback(new Error("blocked address"));
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

const htmlType = (type: string | undefined) => /^(text\/html|application\/xhtml\+xml)\b/i.test(type ?? "");

// Fetches the HTML of a public https page for reading an event from it. Only https on the standard port, no credentials, every redirect is
// checked again, the connection only goes to public addresses, 5 seconds and 2 MB at most, HTML answers only. Nothing of ours is sent.
export async function fetchEventPage(
  rawUrl: string,
  options: { request?: RequestFn; timeoutMs?: number; maxBytes?: number; maxRedirects?: number } = {},
): Promise<PageResult> {
  const request = options.request ?? (https.request as unknown as RequestFn);
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;
  const maxBytes = options.maxBytes ?? DEFAULTS.maxBytes;
  const maxRedirects = options.maxRedirects ?? DEFAULTS.maxRedirects;
  const deadline = Date.now() + timeoutMs;

  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const checked = normalizeEventUrl(current);
    // A redirect target is checked as strictly as the first address (the address itself is used as given, not the cleaned one).
    if (!checked.ok) return { ok: false, reason: "blocked" };
    const parsed = new URL(current);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return { ok: false, reason: "blocked" };

    const outcome = await new Promise<{ kind: "page"; html: string } | { kind: "redirect"; location: string } | { kind: "fail"; reason: Exclude<PageResult & { ok: false }, never>["reason"] }>((resolve) => {
      let settled = false;
      const done = (value: Parameters<typeof resolve>[0]) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(() => {
        req.destroy();
        done({ kind: "fail", reason: "timeout" });
      }, Math.max(deadline - Date.now(), 1));

      const req = request(
        parsed,
        { method: "GET", lookup: guardedLookup as never, headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml", "accept-encoding": "identity" } },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            res.resume();
            return done({ kind: "redirect", location: String(res.headers.location) });
          }
          if (status < 200 || status >= 300) {
            res.resume();
            return done({ kind: "fail", reason: "status" });
          }
          if (!htmlType(res.headers["content-type"] as string | undefined)) {
            res.resume();
            return done({ kind: "fail", reason: "not_html" });
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer | string) => {
            const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
            size += buffer.length;
            if (size > maxBytes) {
              res.destroy();
              return done({ kind: "fail", reason: "too_large" });
            }
            chunks.push(buffer);
          });
          res.on("end", () => done({ kind: "page", html: Buffer.concat(chunks).toString("utf8") }));
          res.on("error", () => done({ kind: "fail", reason: "network" }));
        },
      );
      req.on("error", () => done({ kind: "fail", reason: "network" }));
      req.end();
    });

    if (outcome.kind === "page") return { ok: true, html: outcome.html, finalUrl: current };
    if (outcome.kind === "fail") return { ok: false, reason: outcome.reason };
    try {
      current = new URL(outcome.location, current).toString();
    } catch {
      return { ok: false, reason: "blocked" };
    }
  }
  return { ok: false, reason: "redirects" };
}
