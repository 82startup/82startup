// A list of common zones for the admin to choose from. Every name exists in the database's timezone list.
export const ZONES = [
  "UTC", "Asia/Seoul", "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Asia/Kolkata", "Asia/Dubai", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo", "Pacific/Honolulu", "Australia/Sydney",
] as const;

// The offset in minutes at the end of an ISO date-time (Z, +09:00, -0700, +05), or null when there is none.
export function offsetMinutesOf(iso: string): number | null {
  const match = /(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}(?::?\d{2})?)$/.exec(iso.trim());
  if (!match) return null;
  if (match[1] === "Z") return 0;
  const sign = match[1].startsWith("-") ? -1 : 1;
  const digits = match[1].slice(1).replace(":", "");
  const hours = Number(digits.slice(0, 2));
  const minutes = digits.length > 2 ? Number(digits.slice(2, 4)) : 0;
  return sign * (hours * 60 + minutes);
}

// The offset of a zone at a moment, in minutes east of UTC.
function zoneOffset(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

function validZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// "2027-03-17T09:00" typed in a date-time field, read as the wall clock of `timeZone`, as a UTC instant. Null when it is not a real date-time.
export function localToUtc(local: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match || !validZone(timeZone)) return null;
  const [y, mo, d, h, mi] = match.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(guess);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || check.getUTCHours() !== h || check.getUTCMinutes() !== mi) return null;
  let result = guess - zoneOffset(guess, timeZone) * 60000;
  result = guess - zoneOffset(result, timeZone) * 60000; // once more, near a daylight saving change
  return new Date(result).toISOString();
}

// The value a date-time field shows for a UTC instant, as the wall clock of `timeZone`.
export function utcToLocalInput(iso: string, timeZone: string): string {
  const ms = new Date(iso).getTime();
  return new Date(ms + zoneOffset(ms, timeZone) * 60000).toISOString().slice(0, 16);
}

// A zone from the list that has this offset on that day; UTC if none does or the offset is unknown.
export function zoneForOffset(offsetMinutes: number | null, atIso: string): string {
  if (offsetMinutes === null) return "UTC";
  const ms = new Date(atIso).getTime();
  return ZONES.find((zone) => zoneOffset(ms, zone) === offsetMinutes) ?? "UTC";
}
