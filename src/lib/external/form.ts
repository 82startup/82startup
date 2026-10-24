import type { ParsedEvent } from "./parse";
import { ZONES, localToUtc, utcToLocalInput, zoneForOffset } from "./tz";
import { normalizeEventUrl } from "./url";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const long = (value: string, max: number) => [...value].length > max;
const HTTPS = /^https:\/\/\S+$/;

export type ExternalInput = {
  url: string;
  host: string;
  title: string;
  description: string;
  timezone: string;
  startUtc: string;
  endUtc: string | null;
  locationType: "online" | "offline" | "unknown";
  venueName: string | null;
  venueCity: string | null;
  venueAddress: string | null;
  coverUrl: string | null;
  hidden: boolean;
};
export type ExternalErrors = Partial<Record<"url" | "title" | "description" | "timezone" | "start" | "end" | "location_type" | "venue_name" | "venue_city" | "venue_address" | "cover_url", string>>;

// The form an admin checks and edits before an external event is saved. Times are typed in the chosen zone and become UTC here.
export function parseExternalForm(formData: FormData): { ok: true; value: ExternalInput } | { ok: false; errors: ExternalErrors } {
  const errors: ExternalErrors = {};
  const url = normalizeEventUrl(text(formData, "url"));
  const title = text(formData, "title");
  const description = text(formData, "description");
  const timezone = text(formData, "timezone");
  const start = text(formData, "start");
  const end = text(formData, "end");
  const locationType = text(formData, "location_type") || "unknown";
  const venueName = text(formData, "venue_name");
  const venueCity = text(formData, "venue_city");
  const venueAddress = text(formData, "venue_address");
  const cover = text(formData, "cover_url");

  if (!url.ok) errors.url = "Use an https:// link to the event's page.";
  if (title === "" || long(title, 200)) errors.title = "Enter a title (up to 200 characters).";
  if (long(description, 2000)) errors.description = "The description can be up to 2,000 characters.";
  if (!(ZONES as readonly string[]).includes(timezone)) errors.timezone = "Choose a timezone from the list.";
  if (!["online", "offline", "unknown"].includes(locationType)) errors.location_type = "Choose online, in person or unknown.";
  if (long(venueName, 200)) errors.venue_name = "The venue can be up to 200 characters.";
  if (long(venueCity, 100)) errors.venue_city = "The city can be up to 100 characters.";
  if (long(venueAddress, 300)) errors.venue_address = "The address can be up to 300 characters.";
  if (cover && (cover.length > 500 || !HTTPS.test(cover))) errors.cover_url = "Use an https:// picture address (up to 500 characters).";

  const startUtc = errors.timezone ? null : localToUtc(start, timezone);
  const endUtc = end === "" || errors.timezone ? null : localToUtc(end, timezone);
  if (!errors.timezone && startUtc === null) errors.start = "Enter the start date and time.";
  if (end !== "" && !errors.timezone && endUtc === null) errors.end = "Enter a valid end date and time, or leave it empty.";
  if (startUtc && endUtc && endUtc < startUtc) errors.end = "The end must not be before the start.";

  if (Object.keys(errors).length > 0 || !url.ok || !startUtc) return { ok: false, errors };
  return {
    ok: true,
    value: {
      url: url.url, host: url.host, title, description, timezone, startUtc, endUtc, locationType: locationType as ExternalInput["locationType"],
      venueName: venueName || null, venueCity: venueCity || null, venueAddress: venueAddress || null, coverUrl: cover || null, hidden: formData.get("hidden") === "on",
    },
  };
}

// The page address of an external event: words from the title plus a short code, so two events with the same title do not clash.
export function makeExternalSlug(title: string, code: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "event";
  return `${base}-${code}`;
}

export type Preview = {
  url: string;
  host: string;
  title: string;
  description: string;
  timezone: string;
  start: string;
  end: string;
  locationType: "online" | "offline" | "unknown";
  venueName: string;
  venueCity: string;
  venueAddress: string;
  coverUrl: string;
};

// What the admin sees to check: the page's details, as the values of the form. The zone comes from the page's offset when it has one.
export function toPreview(event: ParsedEvent, url: string, host: string): Preview {
  const timezone = event.startUtc ? zoneForOffset(event.offsetMinutes, event.startUtc) : "UTC";
  const start = event.startUtc ? utcToLocalInput(event.startUtc, timezone) : (event.startLocal ?? "");
  const end = event.endUtc ? utcToLocalInput(event.endUtc, timezone) : (event.endLocal ?? "");
  return {
    url, host, title: event.title, description: event.description, timezone, start, end, locationType: event.locationType,
    venueName: event.venueName ?? "", venueCity: event.venueCity ?? "", venueAddress: event.venueAddress ?? "", coverUrl: event.coverUrl ?? "",
  };
}
