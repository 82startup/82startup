const TRACKING = /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_ga|igshid|ref|ref_.*|aff|affiliate|referrer|source|share)$/i;
const MAX_URL = 500;
const MAX_HOST = 100;

export type NormalizedUrl = { ok: true; url: string; host: string } | { ok: false; reason: "invalid" | "not-https" | "blocked-host" | "too-long" };

// Checks that an address is a plain public https address and writes it in one standard form (no tracking parameters, no fragment,
// lu.ma = luma.com, no trailing slash), so the same event typed two ways is the same address. Hosts that are IP addresses or single
// names without a dot (localhost, intranet) are refused here; the fetch checks the real addresses again.
export function normalizeEventUrl(raw: string): NormalizedUrl {
  const text = raw.trim();
  if (text === "" || text.length > MAX_URL * 2) return { ok: false, reason: text === "" ? "invalid" : "too-long" };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "not-https" };
  if (url.username || url.password) return { ok: false, reason: "invalid" };
  if (url.port !== "" && url.port !== "443") return { ok: false, reason: "invalid" };

  let hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "lu.ma" || hostname === "www.lu.ma") hostname = "luma.com";
  const isIp = /^[0-9.]+$/.test(hostname) || hostname.includes(":") || hostname.startsWith("[");
  if (!hostname.includes(".") || isIp || hostname.length > MAX_HOST || !/^[a-z0-9.-]+$/.test(hostname)) return { ok: false, reason: "blocked-host" };

  const params = [...url.searchParams.entries()].filter(([key]) => !TRACKING.test(key));
  const query = params.length > 0 ? `?${new URLSearchParams(params).toString()}` : "";
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "";
  const clean = `https://${hostname}${path}${query}`;
  if (clean.length > MAX_URL) return { ok: false, reason: "too-long" };
  return { ok: true, url: clean, host: hostname.replace(/^www\./, "") };
}

const LABELS: Record<string, string> = { "luma.com": "Luma", "eventbrite.com": "Eventbrite", "meetup.com": "Meetup" };

// The name shown in "Added from …".
export function hostLabel(host: string): string {
  return LABELS[host] ?? host;
}
