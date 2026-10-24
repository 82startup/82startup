import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventCard } from "./event-card";
import type { PublicEvent } from "@/lib/events/types";

const event = (over: Partial<PublicEvent> = {}): PublicEvent => ({
  id: "e1",
  slug: "summit-abc",
  title: "Summit 2027",
  description: "",
  description_md: "",
  start_at: "2027-03-17T16:00:00.000Z",
  end_at: "2027-03-17T18:00:00.000Z",
  timezone: "UTC",
  location_type: "offline",
  venue_name: "Fort Mason",
  venue_city: "San Francisco",
  venue_address: null,
  cover_url: "https://images.lumacdn.com/cover.png",
  luma_url: "https://luma.com/x",
  featured: false,
  source: "luma",
  external_host: null,
  ...over,
});
const render = (e: PublicEvent, highlight?: boolean) => renderToStaticMarkup(createElement(EventCard, { event: e, highlight }));

describe("EventCard", () => {
  it("keeps the small card for an ordinary event", () => {
    const html = render(event());
    expect(html).toContain("h-24 w-24");
    expect(html).not.toContain("Featured");
    expect(html).toContain('href="/events/summit-abc"');
  });

  it("shows a featured event big: a large cover filling the card, a Featured badge, a large title and a button", () => {
    const html = render(event({ featured: true }));
    expect(html).toContain("Featured");
    expect(html).toContain("min-h-72");
    expect(html).toContain("object-cover");
    expect(html).toContain("text-4xl");
    expect(html).toContain("View event");
    expect(html).toContain('src="https://images.lumacdn.com/cover.png"');
    expect(html).not.toContain("h-24 w-24");
    expect(html).toContain('href="/events/summit-abc"');
  });

  it("shows the date and the venue on the featured card", () => {
    const html = render(event({ featured: true }));
    expect(html).toContain("Wed, Mar 17, 2027");
    expect(html).toContain("Fort Mason");
  });

  it("draws a dark gradient instead of a picture when the featured event has no cover", () => {
    const html = render(event({ featured: true, cover_url: null }));
    expect(html).not.toContain("<img");
    expect(html).toContain("bg-gradient-to-br");
    expect(html).toContain("Summit 2027");
  });

  it("uses the small card for a featured event when highlighting is turned off (the Past tab)", () => {
    const html = render(event({ featured: true }), false);
    expect(html).toContain("h-24 w-24");
    expect(html).not.toContain("Featured");
  });

  it("says where an external event is from, on both card styles, and says nothing for our own events", () => {
    const external = { source: "external", external_host: "eventbrite.com" } as const;
    expect(render(event({ ...external }))).toContain("Added from Eventbrite");
    expect(render(event({ ...external, featured: true }))).toContain("Added from Eventbrite");
    expect(render(event())).not.toContain("Added from");
    expect(render(event({ ...external, external_host: "events.example.org" }))).toContain("Added from events.example.org");
  });

  it("shows an external event's cover with no referrer (it is on another site)", () => {
    expect(render(event({ source: "external", external_host: "eventbrite.com", featured: true }))).toContain('referrerPolicy="no-referrer"');
    expect(render(event({ source: "external", external_host: "eventbrite.com" }))).toContain('referrerPolicy="no-referrer"');
  });

  it("escapes a title with markup in it", () => {
    expect(render(event({ featured: true, title: "<script>x</script>" }))).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});
