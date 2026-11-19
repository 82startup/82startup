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

// Compact pieces for a date badge plus a time line: "MAR" / "17–18" / "WED–THU" and "10:00 AM – 6:00 PM PDT".
export function eventDateBadge(startIso: string, endIso: string | null, timeZone: string) {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    zone = "UTC";
  }
  const pick = (iso: string) => {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return { month: p.month, day: p.day, weekday: p.weekday, time: `${p.hour}:${p.minute} ${p.dayPeriod}`, zone: p.timeZoneName ?? "" };
  };
  const s = pick(startIso);
  const e = endIso ? pick(endIso) : null;
  const sameDay = !e || (e.month === s.month && e.day === s.day);
  const day = !e || sameDay ? s.day : e.month === s.month ? `${s.day}–${e.day}` : `${s.day}–${e.month} ${e.day}`;
  return {
    month: s.month.toUpperCase(),
    day,
    weekday: (!e || sameDay ? s.weekday : `${s.weekday}–${e.weekday}`).toUpperCase(),
    time: e ? `${s.time} – ${e.time} ${s.zone}` : `${s.time} ${s.zone}`,
  };
}
