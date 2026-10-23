import { describe, expect, it } from "vitest";
import { makeSlug, mapEvent } from "./map";
import realEntry from "./__fixtures__/calendar-list-entry.json";
import type { LumaCalendarEvent } from "./types";

const base: LumaCalendarEvent = {
  platform: "luma",
  id: "evt-A1b2C3d4Xyz",
  start_at: "2026-11-07T02:00:00.000Z",
  end_at: "2026-11-07T04:00:00.000Z",
  timezone: "America/Los_Angeles",
  name: "  AI Founders Meetup ",
  cover_url: "https://images.lumacdn.com/c.jpg",
  url: "https://luma.com/ai-founders",
  visibility: "public",
  location_type: "offline",
  location_visibility: "public",
  geo_address_json: {
    address: "Frontier Tower",
    city: "San Francisco",
    region: "California",
    country: "US",
    city_state: "San Francisco, California",
    full_address: "995 Market St, San Francisco, CA 94103, USA",
  },
};

describe("mapEvent", () => {
  it("maps a public Luma event to row fields", () => {
    expect(mapEvent(base)).toEqual({
      luma_event_id: "evt-A1b2C3d4Xyz",
      title: "AI Founders Meetup",
      start_at: "2026-11-07T02:00:00.000Z",
      end_at: "2026-11-07T04:00:00.000Z",
      timezone: "America/Los_Angeles",
      location_type: "offline",
      venue_name: "Frontier Tower",
      venue_city: "San Francisco",
      venue_address: "995 Market St, San Francisco, CA 94103, USA",
      cover_url: "https://images.lumacdn.com/c.jpg",
      luma_url: "https://luma.com/ai-founders",
    });
  });

  it("skips events that are not on Luma or not public", () => {
    expect(mapEvent({ ...base, platform: "external" })).toBeNull();
    for (const visibility of ["members-only", "private", undefined]) {
      expect(mapEvent({ ...base, visibility })).toBeNull();
    }
  });

  it("skips events with a non-https page address or missing basics", () => {
    for (const url of ["http://luma.com/x", "javascript:alert(1)", "", "https://"]) {
      expect(mapEvent({ ...base, url })).toBeNull();
    }
    expect(mapEvent({ ...base, name: "" })).toBeNull();
    expect(mapEvent({ ...base, timezone: "" })).toBeNull();
  });

  it("skips events with an unreadable start time", () => {
    expect(mapEvent({ ...base, start_at: "not a date" })).toBeNull();
  });

  it("keeps end_at null when Luma sends none or an unreadable one", () => {
    expect(mapEvent({ ...base, end_at: undefined })).toMatchObject({ end_at: null });
    expect(mapEvent({ ...base, end_at: "nope" })).toMatchObject({ end_at: null });
  });

  it("drops a cover image that is not https", () => {
    expect(mapEvent({ ...base, cover_url: "http://x.example.com/c.jpg" })).toMatchObject({ cover_url: null });
    expect(mapEvent({ ...base, cover_url: undefined })).toMatchObject({ cover_url: null });
  });

  it("stores only the city when the address is for guests only", () => {
    expect(mapEvent({ ...base, location_visibility: "guests-only" })).toMatchObject({
      venue_name: null,
      venue_address: null,
      venue_city: "San Francisco",
    });
  });

  it("handles online events with no address", () => {
    expect(mapEvent({ ...base, location_type: "zoom", geo_address_json: null })).toMatchObject({
      location_type: "zoom",
      venue_name: null,
      venue_city: null,
      venue_address: null,
    });
  });
});

describe("mapEvent with a real Luma list entry", () => {
  // Captured once from our calendar (read-only), reduced to the fields we read. Checks avoid depending on its values.
  it("is importable and yields valid row fields", () => {
    const row = mapEvent(realEntry as LumaCalendarEvent);
    expect(row).not.toBeNull();
    expect(row!.luma_event_id).toMatch(/^evt-/);
    expect(row!.title.length).toBeGreaterThan(0);
    expect(new Date(row!.start_at).toISOString()).toBe(row!.start_at);
    expect(row!.luma_url).toMatch(/^https:\/\/\S+$/);
    expect(row!.timezone.length).toBeGreaterThan(0);
    expect(makeSlug(row!.title, row!.luma_event_id)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]+$/);
  });
});

describe("makeSlug", () => {
  it("joins a cleaned title and the first 8 characters of the Luma id", () => {
    expect(makeSlug("AI Founders Meetup!", "evt-A1b2C3d4Xyz")).toBe("ai-founders-meetup-a1b2c3d4");
  });

  it("falls back to 'event' when the title has no ASCII letters or digits", () => {
    expect(makeSlug("한국 창업가 모임", "evt-abcdefgh1")).toBe("event-abcdefgh");
  });

  it("cuts a long title to 50 characters without a trailing dash", () => {
    const slug = makeSlug("a ".repeat(60), "evt-abcdefgh1");
    expect(slug.endsWith("-abcdefgh")).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(50 + 1 + 8);
    expect(slug).not.toContain("--");
  });
});
