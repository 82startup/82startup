import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemberEvents, type MemberEvent } from "./member-events";

const event = (over: Partial<MemberEvent> = {}): MemberEvent => ({
  event_id: "e1",
  slug: "summit-abc",
  title: "Summit 2027",
  start_at: "2027-03-17T16:00:00.000Z",
  end_at: "2027-03-17T18:00:00.000Z",
  timezone: "UTC",
  ...over,
});
const render = (events: MemberEvent[]) => renderToStaticMarkup(createElement(MemberEvents, { events }));

describe("MemberEvents", () => {
  it("renders nothing when the list is empty", () => {
    expect(render([])).toBe("");
  });

  it("lists each event as a link to its page with the date in the event's timezone", () => {
    const html = render([event(), event({ event_id: "e2", slug: "night-xyz", title: "Night", end_at: null, timezone: "America/Los_Angeles" })]);
    expect(html).toContain("Attending");
    expect(html).toContain('href="/events/summit-abc"');
    expect(html).toContain(">Summit 2027<");
    expect(html).toContain("Wed, Mar 17, 2027 · 4:00 PM – 6:00 PM UTC");
    expect(html).toContain('href="/events/night-xyz"');
    expect(html).toContain("9:00 AM PDT");
  });

  it("escapes a title with markup in it", () => {
    expect(render([event({ title: "<script>x</script>" })])).not.toContain("<script>");
  });
});
