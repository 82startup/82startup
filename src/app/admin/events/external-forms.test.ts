import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./external-actions", () => ({ readEventLink: vi.fn(), refreshFromLink: vi.fn(), saveExternalEvent: vi.fn(), deleteExternalEvent: vi.fn() }));

const { ExternalEventForm, AddByLink } = await import("./external-forms");

const initial = {
  url: "https://www.eventbrite.com/e/x", host: "eventbrite.com", title: "French Tech Connect", description: "About", timezone: "Asia/Seoul", start: "2026-10-29T18:30", end: "2026-10-29T21:00",
  locationType: "offline" as const, venueName: "Global Startup Center", venueCity: "Seoul", venueAddress: "165 Yeoksam-ro", coverUrl: "https://img.evbuc.com/c.jpg",
};

describe("ExternalEventForm button", () => {
  it("says Save event when changing an event, and the given label when adding one", () => {
    expect(renderToStaticMarkup(createElement(ExternalEventForm, { initial, id: "e1" }))).toContain(">Save event</button>");
    const add = renderToStaticMarkup(createElement(ExternalEventForm, { initial, submitLabel: "Add event" }));
    expect(add).toContain(">Add event</button>");
    expect(add).not.toContain("Save event");
  });
  it("fills the fields from the details and keeps the original link", () => {
    const html = renderToStaticMarkup(createElement(ExternalEventForm, { initial }));
    expect(html).toContain('value="French Tech Connect"');
    expect(html).toContain('name="url" value="https://www.eventbrite.com/e/x"');
    expect(html).toContain('value="2026-10-29T18:30"');
  });
});

describe("AddByLink", () => {
  it("starts with the link box and the Read link button", () => {
    const html = renderToStaticMarkup(createElement(AddByLink));
    expect(html).toContain("Read link");
    expect(html).not.toContain("Add event");
  });
});
