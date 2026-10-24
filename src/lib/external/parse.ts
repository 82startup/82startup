import { offsetMinutesOf } from "./tz";

export type ParsedEvent = {
  title: string;
  description: string;
  startUtc: string | null; // set only when the page gave an offset
  startLocal: string | null; // "YYYY-MM-DDTHH:mm" as written on the page
  endUtc: string | null;
  endLocal: string | null;
  offsetMinutes: number | null;
  venueName: string | null;
  venueCity: string | null;
  venueAddress: string | null;
  locationType: "online" | "offline" | "unknown";
  coverUrl: string | null;
};

const MAX = { title: 200, description: 2000, venueName: 200, venueCity: 100, venueAddress: 300, url: 500 };
const MAX_NODES = 500;
const MAX_DEPTH = 8;
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isInteger(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

// Plain text only: tags are removed (with the scripts and styles inside them), entities decoded, line breaks kept, nothing is ever HTML.
function plain(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  let text = value.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ").replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, "");
  text = decode(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return [...text].slice(0, max).join("");
}

const httpsUrl = (value: unknown): string | null => (typeof value === "string" && /^https:\/\/\S+$/.test(value.trim()) && value.trim().length <= MAX.url ? value.trim() : null);

function isEvent(node: Record<string, unknown>): boolean {
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  return types.some((t) => typeof t === "string" && /(^|[/#])[A-Za-z]*Event$/.test(t));
}

function collect(value: unknown, out: Record<string, unknown>[], budget: { n: number }, depth: number): void {
  if (budget.n-- <= 0 || depth > MAX_DEPTH || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collect(item, out, budget, depth + 1);
    return;
  }
  const node = value as Record<string, unknown>;
  out.push(node);
  if (node["@graph"]) collect(node["@graph"], out, budget, depth + 1);
}

function ldNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const budget = { n: MAX_NODES };
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try {
      collect(JSON.parse(match[1]), nodes, budget, 0);
    } catch {
      // A block that is not valid JSON is skipped.
    }
  }
  return nodes;
}

function meta(html: string, property: string): string | null {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = tag[0];
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(attrs);
    if (key?.toLowerCase() === property && content) return content[1] ?? content[2] ?? null;
  }
  return null;
}

type Time = { utc: string | null; local: string | null; offset: number | null };

function time(value: unknown): Time {
  const empty: Time = { utc: null, local: null, offset: null };
  if (typeof value !== "string") return empty;
  const text = value.trim();
  const local = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(text);
  if (!local) return empty;
  const offset = offsetMinutesOf(text);
  const ms = offset !== null ? new Date(text.replace(" ", "T")).getTime() : NaN;
  return { utc: Number.isNaN(ms) ? null : new Date(ms).toISOString(), local: `${local[1]}T${local[2] ?? "00:00"}`, offset: Number.isNaN(ms) ? null : offset };
}

function imageOf(value: unknown): string | null {
  if (typeof value === "string") return httpsUrl(value);
  if (Array.isArray(value)) return value.map(imageOf).find(Boolean) ?? null;
  if (value && typeof value === "object") return httpsUrl((value as { url?: unknown }).url);
  return null;
}

function placeOf(value: unknown): { name: string | null; city: string | null; address: string | null; virtual: boolean } {
  const none = { name: null, city: null, address: null, virtual: false };
  if (typeof value === "string") return { ...none, name: plain(value, MAX.venueName) || null };
  if (Array.isArray(value)) {
    const places = value.map(placeOf);
    return places.find((p) => p.name || p.address) ?? places[0] ?? none;
  }
  if (!value || typeof value !== "object") return none;
  const place = value as Record<string, unknown>;
  const type = String(place["@type"] ?? "");
  if (/VirtualLocation/i.test(type)) return { ...none, virtual: true };
  const raw = place.address;
  let city: string | null = null;
  let address: string | null = null;
  if (typeof raw === "string") {
    address = plain(raw, MAX.venueAddress) || null;
  } else if (raw && typeof raw === "object") {
    const a = raw as Record<string, unknown>;
    city = plain(a.addressLocality, MAX.venueCity) || null;
    address = [a.streetAddress, a.addressLocality, a.addressRegion].map((x) => plain(x, 100)).filter(Boolean).join(", ").slice(0, MAX.venueAddress) || null;
  }
  return { name: plain(place.name, MAX.venueName) || null, city, address, virtual: false };
}

// Reads an event from a page: its schema.org Event data when there is any, otherwise the page's title, description and picture tags.
// Everything returned is plain text within the limits the database enforces; the date is left empty when the page does not give one.
export function parseEventPage(html: string): { ok: true; event: ParsedEvent } | { ok: false } {
  const node = ldNodes(html).find((n) => isEvent(n) && plain(n.name, MAX.title) !== "");
  if (node) {
    const start = time(node.startDate);
    const end = time(node.endDate);
    const place = placeOf(node.location);
    const mode = String(node.eventAttendanceMode ?? "");
    const online = (/Online/i.test(mode) && !/Mixed/i.test(mode)) || (place.virtual && !place.name && !place.address);
    return {
      ok: true,
      event: {
        title: plain(node.name, MAX.title),
        description: plain(node.description, MAX.description),
        startUtc: start.utc,
        startLocal: start.local,
        endUtc: end.utc,
        endLocal: end.local,
        offsetMinutes: start.offset,
        venueName: online ? null : place.name,
        venueCity: online ? null : place.city,
        venueAddress: online ? null : place.address,
        locationType: online ? "online" : place.name || place.address ? "offline" : "unknown",
        coverUrl: imageOf(node.image),
      },
    };
  }

  const title = plain(decode(meta(html, "og:title") ?? ""), MAX.title) || plain(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], MAX.title);
  if (!title) return { ok: false };
  return {
    ok: true,
    event: {
      title,
      description: plain(decode(meta(html, "og:description") ?? meta(html, "description") ?? ""), MAX.description),
      startUtc: null, startLocal: null, endUtc: null, endLocal: null, offsetMinutes: null,
      venueName: null, venueCity: null, venueAddress: null, locationType: "unknown",
      coverUrl: httpsUrl(decode(meta(html, "og:image") ?? "")),
    },
  };
}
