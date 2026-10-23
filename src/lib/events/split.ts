import type { PublicEvent } from "./types";

export function splitEvents(events: PublicEvent[], now: Date): { upcoming: PublicEvent[]; past: PublicEvent[] } {
  const upcoming: PublicEvent[] = [];
  const past: PublicEvent[] = [];
  for (const event of events) {
    (new Date(event.end_at ?? event.start_at) >= now ? upcoming : past).push(event);
  }
  upcoming.sort((a, b) => a.start_at.localeCompare(b.start_at));
  past.sort((a, b) => b.start_at.localeCompare(a.start_at));
  return { upcoming, past };
}
