import { describe, expect, it } from "vitest";
import { parseEventPage } from "./parse";

// "</script" inside the JSON is escaped as a real page must do it, so the data block is not cut short.
const ld = (data: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(data).replace(/<\/script/gi, "<\\/script")}</script></head><body></body></html>`;
const event = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Founders Night",
  description: "Come along &amp; meet <b>founders</b>.<br>Bring a friend.",
  startDate: "2027-03-17T18:00:00-07:00",
  endDate: "2027-03-17T21:00:00-07:00",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: { "@type": "Place", name: "Fort Mason Center", address: { "@type": "PostalAddress", streetAddress: "2 Marina Blvd", addressLocality: "San Francisco", addressRegion: "CA" } },
  image: ["https://img.evbuc.com/cover.jpg"],
};
const parsed = (html: string) => {
  const result = parseEventPage(html);
  if (!result.ok) throw new Error("not parsed");
  return result.event;
};

describe("parseEventPage with schema.org Event data", () => {
  it("reads title, plain-text description, times, venue and cover", () => {
    const e = parsed(ld(event));
    expect(e.title).toBe("Founders Night");
    expect(e.description).toBe("Come along & meet founders.\nBring a friend.");
    expect(e.startUtc).toBe("2027-03-18T01:00:00.000Z");
    expect(e.endUtc).toBe("2027-03-18T04:00:00.000Z");
    expect(e.offsetMinutes).toBe(-420);
    expect(e.venueName).toBe("Fort Mason Center");
    expect(e.venueCity).toBe("San Francisco");
    expect(e.venueAddress).toBe("2 Marina Blvd, San Francisco, CA");
    expect(e.locationType).toBe("offline");
    expect(e.coverUrl).toBe("https://img.evbuc.com/cover.jpg");
  });

  it("finds the Event inside an array, a @graph, or a list of types", () => {
    expect(parsed(ld([{ "@type": "WebSite", name: "Site" }, event])).title).toBe("Founders Night");
    expect(parsed(ld({ "@context": "https://schema.org", "@graph": [{ "@type": "Organization", name: "Org" }, event] })).title).toBe("Founders Night");
    expect(parsed(ld({ ...event, "@type": ["Thing", "SocialEvent"] })).title).toBe("Founders Night");
    expect(parsed(ld({ ...event, "@type": "BusinessEvent" })).title).toBe("Founders Night");
  });

  it("reads an online event and a virtual location without inventing a venue", () => {
    const e = parsed(ld({ ...event, eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode", location: { "@type": "VirtualLocation", url: "https://zoom.us/j/1" } }));
    expect(e.locationType).toBe("online");
    expect(e.venueName).toBeNull();
    expect(e.venueAddress).toBeNull();
  });

  it("accepts a location that is only text, an image object, and an address that is only text", () => {
    const e = parsed(ld({ ...event, location: { "@type": "Place", name: "Hall", address: "1 Main St, Seoul" }, image: { "@type": "ImageObject", url: "https://img.test/c.png" } }));
    expect(e.venueAddress).toBe("1 Main St, Seoul");
    expect(e.coverUrl).toBe("https://img.test/c.png");
    expect(parsed(ld({ ...event, location: "Online or Seoul" })).venueName).toBe("Online or Seoul");
  });

  it("keeps a date with no offset as local text and gives no UTC time (the admin must say which zone)", () => {
    const e = parsed(ld({ ...event, startDate: "2027-03-17T18:00:00", endDate: undefined }));
    expect(e.startUtc).toBeNull();
    expect(e.startLocal).toBe("2027-03-17T18:00");
    expect(e.offsetMinutes).toBeNull();
    expect(e.endUtc).toBeNull();
  });

  it("leaves the date empty when there is none or it is not a date", () => {
    expect(parsed(ld({ ...event, startDate: undefined })).startUtc).toBeNull();
    expect(parsed(ld({ ...event, startDate: "next Tuesday" })).startUtc).toBeNull();
  });

  it("ignores a picture that is not https and keeps only the parts that fit the limits", () => {
    expect(parsed(ld({ ...event, image: "http://img.test/c.jpg" })).coverUrl).toBeNull();
    const e = parsed(ld({ ...event, name: "T".repeat(500), description: "d".repeat(5000) }));
    expect(e.title.length).toBe(200);
    expect(e.description.length).toBe(2000);
  });

  it("keeps markup and scripts in text as plain text, never as HTML", () => {
    const e = parsed(ld({ ...event, name: "<script>alert(1)</script>Night", description: "<img src=x onerror=alert(1)>Hello <script>evil()</script>" }));
    expect(e.title).not.toContain("<");
    expect(e.description).not.toContain("<");
    expect(e.description).toContain("Hello");
  });

  it("survives malformed or hostile data: broken JSON, wrong types, huge nesting", () => {
    expect(parseEventPage(`<script type="application/ld+json">{not json</script>`)).toEqual({ ok: false });
    expect(parseEventPage(ld({ "@type": "Event", name: 42, startDate: {}, location: [null, 5, "x"], image: [null] }))).toEqual({ ok: false });
    let deep: unknown = { "@type": "Event", name: "Deep" };
    for (let i = 0; i < 200; i++) deep = { "@graph": [deep] };
    expect(() => parseEventPage(ld(deep))).not.toThrow();
  });
});

describe("parseEventPage without event data", () => {
  it("falls back to the page's title, description and picture tags (the date stays empty)", () => {
    const html = `<html><head><title>Fallback Title</title><meta property="og:title" content="OG Title &amp; More"><meta property="og:description" content="About it"><meta property="og:image" content="https://img.test/og.png"></head></html>`;
    const e = parsed(html);
    expect(e.title).toBe("OG Title & More");
    expect(e.description).toBe("About it");
    expect(e.coverUrl).toBe("https://img.test/og.png");
    expect(e.startUtc).toBeNull();
    expect(e.locationType).toBe("unknown");
  });

  it("uses the <title> when there is no og:title", () => {
    expect(parsed("<html><head><title> Just A Title </title></head></html>").title).toBe("Just A Title");
  });

  it("reports a page that is not an event page", () => {
    expect(parseEventPage("<html><body>hello</body></html>")).toEqual({ ok: false });
    expect(parseEventPage("")).toEqual({ ok: false });
  });
});
