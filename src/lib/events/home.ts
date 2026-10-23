import { splitEvents } from "./split";
import type { PublicEvent } from "./types";

export const HOME_UPCOMING_LIMIT = 3;

export function pickHomeEvents(events: PublicEvent[], now: Date): { featured: PublicEvent[]; upcoming: PublicEvent[] } {
  const notEnded = splitEvents(events, now).upcoming; // soonest first
  return {
    featured: notEnded.filter((e) => e.featured),
    upcoming: notEnded.filter((e) => !e.featured).slice(0, HOME_UPCOMING_LIMIT),
  };
}
