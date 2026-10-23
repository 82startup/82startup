import { describe, expect, it } from "vitest";
import { splitEvents } from "./split";
import type { PublicEvent } from "./types";

const NOW = new Date("2026-11-10T12:00:00.000Z");

const ev = (slug: string, start: string, end: string | null): PublicEvent => ({
  slug, title: slug, description: "", start_at: start, end_at: end, timezone: "UTC", location_type: "offline",
  venue_name: null, venue_city: null, venue_address: null, cover_url: null, luma_url: "https://luma.com/x",
});

describe("splitEvents", () => {
  it("puts events that have not ended in upcoming, soonest first, and the rest in past, most recent first", () => {
    const { upcoming, past } = splitEvents(
      [
        ev("later", "2026-12-01T10:00:00Z", "2026-12-01T12:00:00Z"),
        ev("old", "2026-09-01T10:00:00Z", "2026-09-01T12:00:00Z"),
        ev("soon", "2026-11-11T10:00:00Z", "2026-11-11T12:00:00Z"),
        ev("older", "2026-08-01T10:00:00Z", "2026-08-01T12:00:00Z"),
      ],
      NOW,
    );
    expect(upcoming.map((e) => e.slug)).toEqual(["soon", "later"]);
    expect(past.map((e) => e.slug)).toEqual(["old", "older"]);
  });

  it("keeps an event that started but has not ended in upcoming", () => {
    const { upcoming, past } = splitEvents([ev("now", "2026-11-10T10:00:00Z", "2026-11-10T14:00:00Z")], NOW);
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });

  it("uses the start time when there is no end time", () => {
    const { upcoming, past } = splitEvents([ev("a", "2026-11-09T10:00:00Z", null), ev("b", "2026-11-11T10:00:00Z", null)], NOW);
    expect(upcoming.map((e) => e.slug)).toEqual(["b"]);
    expect(past.map((e) => e.slug)).toEqual(["a"]);
  });
});
