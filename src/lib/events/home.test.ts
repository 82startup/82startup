import { describe, expect, it } from "vitest";
import { HOME_UPCOMING_LIMIT, pickHomeEvents } from "./home";
import type { PublicEvent } from "./types";

const NOW = new Date("2026-11-10T12:00:00.000Z");

const ev = (slug: string, start: string, end: string | null, featured = false): PublicEvent => ({
  id: `id-${slug}`, slug, title: slug, description: "", description_md: "", start_at: start, end_at: end, timezone: "UTC", location_type: "offline",
  venue_name: null, venue_city: null, venue_address: null, cover_url: null, luma_url: "https://luma.com/x", featured, source: "luma", external_host: null,
});

const day = (n: number) => `2026-11-${String(n).padStart(2, "0")}T10:00:00Z`;

describe("pickHomeEvents", () => {
  it("returns no featured events when none is flagged, and the next upcoming ones soonest first", () => {
    const { featured, upcoming } = pickHomeEvents([ev("c", day(20), null), ev("a", day(12), null), ev("b", day(15), null)], NOW);
    expect(featured).toEqual([]);
    expect(upcoming.map((e) => e.slug)).toEqual(["a", "b", "c"]);
  });

  it("limits upcoming to 3", () => {
    const many = [1, 2, 3, 4, 5].map((n) => ev(`e${n}`, day(10 + n), null));
    expect(HOME_UPCOMING_LIMIT).toBe(3);
    expect(pickHomeEvents(many, NOW).upcoming.map((e) => e.slug)).toEqual(["e1", "e2", "e3"]);
  });

  it("shows flagged events as featured, soonest first, and never repeats them under upcoming", () => {
    const { featured, upcoming } = pickHomeEvents(
      [ev("plain1", day(12), null), ev("star2", day(25), null, true), ev("star1", day(18), null, true), ev("plain2", day(14), null)],
      NOW,
    );
    expect(featured.map((e) => e.slug)).toEqual(["star1", "star2"]);
    expect(upcoming.map((e) => e.slug)).toEqual(["plain1", "plain2"]);
  });

  it("fills the 3 upcoming slots with non-featured events only", () => {
    const events = [ev("star", day(11), null, true), ...[1, 2, 3, 4].map((n) => ev(`p${n}`, day(11 + n), null))];
    expect(pickHomeEvents(events, NOW).upcoming.map((e) => e.slug)).toEqual(["p1", "p2", "p3"]);
  });

  it("leaves out events that have ended, flagged or not", () => {
    const { featured, upcoming } = pickHomeEvents(
      [ev("old", "2026-10-01T10:00:00Z", "2026-10-01T12:00:00Z"), ev("oldstar", "2026-10-02T10:00:00Z", null, true)],
      NOW,
    );
    expect(featured).toEqual([]);
    expect(upcoming).toEqual([]);
  });

  it("keeps an event that started but has not ended", () => {
    const { upcoming } = pickHomeEvents([ev("now", "2026-11-10T10:00:00Z", "2026-11-10T14:00:00Z")], NOW);
    expect(upcoming.map((e) => e.slug)).toEqual(["now"]);
  });

  it("uses the start time when there is no end time", () => {
    const { upcoming } = pickHomeEvents([ev("gone", "2026-11-09T10:00:00Z", null), ev("next", day(11), null)], NOW);
    expect(upcoming.map((e) => e.slug)).toEqual(["next"]);
  });

  it("handles no events", () => {
    expect(pickHomeEvents([], NOW)).toEqual({ featured: [], upcoming: [] });
  });
});
