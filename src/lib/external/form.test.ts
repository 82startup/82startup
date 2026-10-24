import { describe, expect, it } from "vitest";
import { makeExternalSlug, parseExternalForm, toPreview } from "./form";
import type { ParsedEvent } from "./parse";

const base = {
  url: "https://www.eventbrite.com/e/founders-night-123",
  title: "Founders Night",
  description: "Come along",
  timezone: "America/Los_Angeles",
  start: "2027-03-17T18:00",
  end: "2027-03-17T21:00",
  location_type: "offline",
  venue_name: "Fort Mason",
  venue_city: "San Francisco",
  venue_address: "2 Marina Blvd",
  cover_url: "https://img.evbuc.com/c.jpg",
};
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe("parseExternalForm", () => {
  it("accepts a complete form and turns the typed times into UTC in the chosen zone", () => {
    expect(parseExternalForm(form(base))).toEqual({
      ok: true,
      value: {
        url: "https://www.eventbrite.com/e/founders-night-123", host: "eventbrite.com", title: "Founders Night", description: "Come along",
        timezone: "America/Los_Angeles", startUtc: "2027-03-18T01:00:00.000Z", endUtc: "2027-03-18T04:00:00.000Z", locationType: "offline",
        venueName: "Fort Mason", venueCity: "San Francisco", venueAddress: "2 Marina Blvd", coverUrl: "https://img.evbuc.com/c.jpg", hidden: false,
      },
    });
  });

  it("needs only a link, a title and a start; the rest may be empty", () => {
    const r = parseExternalForm(form({ url: base.url, title: "T", timezone: "UTC", start: "2027-03-17T18:00" }));
    expect(r).toMatchObject({ ok: true, value: { endUtc: null, venueName: null, coverUrl: null, description: "", locationType: "unknown", hidden: false } });
  });

  it("reads the hidden box", () => {
    expect(parseExternalForm(form({ ...base, hidden: "on" }))).toMatchObject({ ok: true, value: { hidden: true } });
  });

  it("has its own error for each required field", () => {
    expect(parseExternalForm(form({ ...base, title: "   " }))).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    expect(parseExternalForm(form({ ...base, start: "" }))).toMatchObject({ ok: false, errors: { start: expect.any(String) } });
    expect(parseExternalForm(form({ ...base, start: "2027-13-45T99:99" }))).toMatchObject({ ok: false, errors: { start: expect.any(String) } });
    expect(parseExternalForm(form({ ...base, url: "http://x.test/e" }))).toMatchObject({ ok: false, errors: { url: expect.any(String) } });
    expect(parseExternalForm(form({ ...base, timezone: "Mars/Base" }))).toMatchObject({ ok: false, errors: { timezone: expect.any(String) } });
  });

  it("refuses an end before the start, and a location type that is not one of the three", () => {
    expect(parseExternalForm(form({ ...base, end: "2027-03-17T17:00" }))).toMatchObject({ ok: false, errors: { end: expect.any(String) } });
    expect(parseExternalForm(form({ ...base, location_type: "hybrid" }))).toMatchObject({ ok: false, errors: { location_type: expect.any(String) } });
  });

  it("enforces every limit exactly", () => {
    expect(parseExternalForm(form({ ...base, title: "t".repeat(200), description: "d".repeat(2000), venue_name: "n".repeat(200), venue_city: "c".repeat(100), venue_address: "a".repeat(300) }))).toMatchObject({ ok: true });
    for (const [field, size, key] of [["title", 201, "title"], ["description", 2001, "description"], ["venue_name", 201, "venue_name"], ["venue_city", 101, "venue_city"], ["venue_address", 301, "venue_address"]] as const) {
      expect(parseExternalForm(form({ ...base, [field]: "x".repeat(size) }))).toMatchObject({ ok: false, errors: { [key]: expect.any(String) } });
    }
  });

  it("accepts only an https cover picture address", () => {
    for (const bad of ["http://img.test/c.jpg", "javascript:alert(1)", "img.test/c.jpg", "https://a b.test/c.jpg"]) {
      expect(parseExternalForm(form({ ...base, cover_url: bad }))).toMatchObject({ ok: false, errors: { cover_url: expect.any(String) } });
    }
  });
});

describe("makeExternalSlug", () => {
  it("makes lower-case words plus a short code", () => {
    expect(makeExternalSlug("Founders Night!", "a1b2c3")).toBe("founders-night-a1b2c3");
  });
  it("uses 'event' for a title with no latin letters or digits, and keeps it short", () => {
    expect(makeExternalSlug("김하나 모임", "a1b2c3")).toBe("event-a1b2c3");
    expect(makeExternalSlug("x".repeat(300), "a1b2c3").length).toBeLessThanOrEqual(100);
  });
});

describe("toPreview", () => {
  const parsed: ParsedEvent = {
    title: "Founders Night", description: "About", startUtc: "2027-03-18T01:00:00.000Z", startLocal: "2027-03-17T18:00", endUtc: "2027-03-18T04:00:00.000Z", endLocal: "2027-03-17T21:00",
    offsetMinutes: -420, venueName: "Fort Mason", venueCity: "San Francisco", venueAddress: "2 Marina Blvd", locationType: "offline", coverUrl: "https://img.test/c.jpg",
  };
  it("fills the form from what the page gave, choosing the zone from the page's offset", () => {
    expect(toPreview(parsed, "https://www.eventbrite.com/e/x", "eventbrite.com")).toMatchObject({
      url: "https://www.eventbrite.com/e/x", host: "eventbrite.com", title: "Founders Night", timezone: "America/Los_Angeles", start: "2027-03-17T18:00", end: "2027-03-17T21:00", locationType: "offline",
    });
  });
  it("leaves the start empty when the page gave none, and uses the page's local text when it has no offset (zone UTC)", () => {
    expect(toPreview({ ...parsed, startUtc: null, startLocal: null, endUtc: null, endLocal: null, offsetMinutes: null }, "https://x.test/e", "x.test")).toMatchObject({ start: "", end: "", timezone: "UTC" });
    expect(toPreview({ ...parsed, startUtc: null, endUtc: null, offsetMinutes: null }, "https://x.test/e", "x.test")).toMatchObject({ start: "2027-03-17T18:00", end: "2027-03-17T21:00", timezone: "UTC" });
  });
});
