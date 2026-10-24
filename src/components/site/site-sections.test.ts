import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpeakersGrid } from "./speakers-grid";
import { SponsorsSection } from "./sponsors-section";
import type { Speaker, Sponsor } from "@/lib/site/types";

const BASE = "http://127.0.0.1:55321";
const ID = "11111111-2222-3333-4444-555555555555";

const sponsor = (over: Partial<Sponsor> = {}): Sponsor => ({
  id: "s1", name: "Acme", tier: "gold", website_url: "https://acme.test", description: "About Acme", logo_path: `sponsors/${ID}.png`, sort_order: 1, visible: true, ...over,
});
const speaker = (over: Partial<Speaker> = {}): Speaker => ({
  id: "p1", slug: "ada-lee", name: "Ada Lee", job_title: "CEO", company: "Acme", photo_path: `speakers/${ID}.jpg`, event_ids: [], sort_order: 1, visible: true, ...over,
});
const sponsors = (list: Sponsor[], contact: string | null = null) => renderToStaticMarkup(createElement(SponsorsSection, { sponsors: list, contact, baseUrl: BASE }));
const speakers = (list: Speaker[]) => renderToStaticMarkup(createElement(SpeakersGrid, { speakers: list, baseUrl: BASE }));

describe("SponsorsSection", () => {
  it("shows tiers in order, hides empty tiers, and gives each tier its own heading", () => {
    const html = sponsors([sponsor({ id: "b", name: "Bronze Co", tier: "bronze" }), sponsor({ id: "p", name: "Plat Co", tier: "platinum" })]);
    expect(html.indexOf("Platinum sponsors")).toBeGreaterThan(-1);
    expect(html.indexOf("Platinum sponsors")).toBeLessThan(html.indexOf("Bronze sponsors"));
    expect(html).not.toContain("Gold sponsors");
    expect(html).not.toContain("Silver sponsors");
  });

  it("shows a Diamond tier after Platinum and before Gold, large like Platinum, with its description", () => {
    const html = sponsors([sponsor({ id: "g", tier: "gold", name: "Gold Co" }), sponsor({ id: "d", tier: "diamond", name: "Diamond Co", description: "Diamond description" }), sponsor({ id: "p", tier: "platinum", name: "Plat Co" })]);
    expect(html.indexOf("Platinum sponsors")).toBeLessThan(html.indexOf("Diamond sponsors"));
    expect(html.indexOf("Diamond sponsors")).toBeLessThan(html.indexOf("Gold sponsors"));
    expect(html).toContain("Diamond description");
  });

  it("shows a platinum sponsor large with its description and website link, opening in a new tab safely", () => {
    const html = sponsors([sponsor({ tier: "platinum", description: "Big description" })]);
    expect(html).toContain("Big description");
    expect(html).toContain('href="https://acme.test"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("draws logos only from our own bucket, lazy, with no referrer and the name as their text", () => {
    const html = sponsors([sponsor()]);
    expect(html).toContain(`src="${BASE}/storage/v1/object/public/site-images/sponsors/${ID}.png"`);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('alt="Acme"');
  });

  it("never draws a picture from another address: it shows the name instead", () => {
    const html = sponsors([sponsor({ logo_path: "https://evil.test/logo.png" })]);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("evil.test");
    expect(html).toContain("Acme");
  });

  it("writes a sponsor's name once when it has no logo (gold and platinum show it next to the logo anyway)", () => {
    for (const tier of ["platinum", "gold"] as const) {
      const html = sponsors([sponsor({ tier, logo_path: null, name: "Nologo Inc", description: "" })]);
      expect(html.match(/Nologo Inc/g)?.length).toBe(1);
    }
    expect(sponsors([sponsor({ tier: "bronze", logo_path: null, name: "Nologo Inc" })])).toContain("Nologo Inc");
  });

  it("does not link a website that is not https", () => {
    const html = sponsors([sponsor({ tier: "platinum", website_url: "javascript:alert(1)" })]);
    expect(html).not.toContain("javascript:");
  });

  it("escapes text with markup in it", () => {
    const html = sponsors([sponsor({ name: "<script>x</script>", tier: "platinum", description: "<b>bold</b>" })]);
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("shows the Reach out button only when a contact link is set, and only for https or mailto", () => {
    expect(sponsors([sponsor()])).not.toContain("Reach out");
    expect(sponsors([sponsor()], "mailto:sponsors@x.test")).toContain('href="mailto:sponsors@x.test"');
    expect(sponsors([sponsor()], "https://x.test/contact")).toContain("Reach out");
    expect(sponsors([sponsor()], "javascript:alert(1)")).not.toContain("Reach out");
  });
});

describe("SpeakersGrid", () => {
  it("shows a card per speaker with photo, name, title and company, linking to the speaker's page", () => {
    const html = speakers([speaker()]);
    expect(html).toContain('href="/speakers/ada-lee"');
    expect(html).toContain("Ada Lee");
    expect(html).toContain("CEO");
    expect(html).toContain("Acme");
    expect(html).toContain(`/storage/v1/object/public/site-images/speakers/${ID}.jpg`);
    expect(html).toContain('referrerPolicy="no-referrer"');
  });
  it("shows initials instead of a picture when there is no photo or it is not ours", () => {
    for (const photo_path of [null, "https://evil.test/p.jpg"]) {
      const html = speakers([speaker({ photo_path })]);
      expect(html).not.toContain("<img");
      expect(html).not.toContain("evil.test");
      expect(html).toContain("AL");
    }
  });
  it("leaves out the dash when the title or company is missing, and escapes text", () => {
    expect(speakers([speaker({ company: "" })])).not.toContain(" · ");
    expect(speakers([speaker({ name: "<img src=x onerror=1>" })])).not.toContain("<img src=x");
  });
});
