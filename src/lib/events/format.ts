import type { PublicEvent } from "./types";

const ONLINE_TYPES = new Set(["zoom", "meet", "youtube", "twitch", "twitter", "discord"]);

function parts(date: Date, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" });
  // Newer ICU versions put a narrow no-break space before AM/PM; normalise it to a plain space.
  const clean = (s: string) => s.replace(/[  ]/g, " ");
  return {
    day: clean(day.format(date)),
    time: clean(time.format(date)),
    zone: zone.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "",
  };
}

export function formatEventTime(startIso: string, endIso: string | null, timeZone: string): string {
  let zoneName = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    zoneName = "UTC";
  }
  const start = parts(new Date(startIso), zoneName);
  if (!endIso) return `${start.day} · ${start.time} ${start.zone}`;
  const end = parts(new Date(endIso), zoneName);
  if (start.day === end.day) return `${start.day} · ${start.time} – ${end.time} ${start.zone}`;
  return `${start.day}, ${start.time} – ${end.day}, ${end.time} ${start.zone}`;
}

export function venueLabel(e: Pick<PublicEvent, "location_type" | "venue_name" | "venue_city">): string | null {
  if (ONLINE_TYPES.has(e.location_type)) return "Online";
  return [e.venue_name, e.venue_city].filter(Boolean).join(", ") || null;
}

// The longer place line for the event page: the full address, with the venue name in front only if the address lacks it.
export function venueDetail(e: Pick<PublicEvent, "location_type" | "venue_name" | "venue_city" | "venue_address">): string | null {
  if (ONLINE_TYPES.has(e.location_type)) return "Online";
  if (e.venue_address) {
    if (!e.venue_name || e.venue_address.includes(e.venue_name)) return e.venue_address;
    return `${e.venue_name} · ${e.venue_address}`;
  }
  return venueLabel(e);
}
