import { describe, expect, it } from "vitest";
import { formatEventTime, venueDetail, venueLabel } from "./format";

describe("formatEventTime", () => {
  it("shows the day once and a time range in the event's own time zone", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", "2026-11-07T04:00:00Z", "America/Los_Angeles")).toBe(
      "Fri, Nov 6, 2026 · 6:00 PM – 8:00 PM PST",
    );
  });

  it("shows both days when the event crosses midnight", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", "2026-11-07T10:00:00Z", "America/Los_Angeles")).toBe(
      "Fri, Nov 6, 2026, 6:00 PM – Sat, Nov 7, 2026, 2:00 AM PST",
    );
  });

  it("shows only the start when there is no end", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", null, "America/Los_Angeles")).toBe("Fri, Nov 6, 2026 · 6:00 PM PST");
  });

  it("falls back to UTC for an unknown time zone", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", null, "Not/AZone")).toBe("Sat, Nov 7, 2026 · 2:00 AM UTC");
  });
});

describe("venueLabel", () => {
  it("joins venue name and city for in-person events", () => {
    expect(venueLabel({ location_type: "offline", venue_name: "Frontier Tower", venue_city: "San Francisco" })).toBe(
      "Frontier Tower, San Francisco",
    );
  });
  it("uses just the city when the name is hidden", () => {
    expect(venueLabel({ location_type: "offline", venue_name: null, venue_city: "San Francisco" })).toBe("San Francisco");
  });
  it("says Online for online events", () => {
    for (const type of ["zoom", "meet", "youtube", "twitch", "twitter", "discord"]) {
      expect(venueLabel({ location_type: type, venue_name: null, venue_city: null })).toBe("Online");
    }
  });
  it("is null when nothing is known", () => {
    expect(venueLabel({ location_type: "missing", venue_name: null, venue_city: null })).toBeNull();
  });
});

describe("venueDetail", () => {
  const base = { location_type: "offline", venue_name: null, venue_city: null, venue_address: null };

  it("shows just the full address when it already contains the venue name", () => {
    expect(
      venueDetail({ ...base, venue_name: "Fort Mason Center", venue_city: "San Francisco", venue_address: "Fort Mason Center, 2 Marina Blvd, San Francisco, CA 94109, USA" }),
    ).toBe("Fort Mason Center, 2 Marina Blvd, San Francisco, CA 94109, USA");
  });

  it("puts the venue name before an address that does not contain it", () => {
    expect(
      venueDetail({ ...base, venue_name: "Frontier Tower", venue_city: "San Francisco", venue_address: "995 Market St, San Francisco, CA 94103, USA" }),
    ).toBe("Frontier Tower · 995 Market St, San Francisco, CA 94103, USA");
  });

  it("falls back to the short venue label without an address", () => {
    expect(venueDetail({ ...base, venue_name: "Mission Bay", venue_city: "San Francisco" })).toBe("Mission Bay, San Francisco");
  });

  it("says Online for online events and is null when nothing is known", () => {
    expect(venueDetail({ ...base, location_type: "zoom" })).toBe("Online");
    expect(venueDetail({ ...base, location_type: "missing" })).toBeNull();
  });
});
