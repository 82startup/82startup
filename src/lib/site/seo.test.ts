import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const root = resolve(import.meta.dirname, "../../..");
const pages = ["index", "schedule", "speakers", "venue", "tickets"];
const html = (page: string) => readFileSync(resolve(root, `public/${page}.html`), "utf8");
const meta = (page: string, pattern: RegExp) => html(page).match(pattern)?.[1] ?? "";
const graph = (page: string) => JSON.parse(meta(page, /<script type="application\/ld\+json">(.*?)<\/script>/))["@graph"] as Array<Record<string, unknown>>;

describe("public SEO", () => {
  it("gives every Summit page its own title, description, canonical URL and robots tag", () => {
    const titles = pages.map((page) => meta(page, /<title>(.*?)<\/title>/));
    const descriptions = pages.map((page) => meta(page, /<meta name="description" content="([^"]*)"/));
    expect(new Set(titles).size).toBe(pages.length);
    expect(new Set(descriptions).size).toBe(pages.length);
    for (const title of titles) expect(title).toContain("82 Startup Week 2027");
    for (const page of pages) {
      expect(html(page)).toContain(`<link rel="canonical" href="https://82startup.com/${page === "index" ? "" : `${page}.html`}">`);
      expect(html(page)).toContain('<meta name="robots" content="index, follow, max-image-preview:large">');
    }
  });

  it("describes the seven events as structured data where they are listed", () => {
    for (const page of ["index", "schedule", "tickets"]) {
      const events = graph(page).filter((node) => node["@type"] === "Event");
      expect(events).toHaveLength(7);
      for (const event of events) {
        expect(event.startDate).toMatch(/^2027-03-\d\dT/);
        expect((event.offers as Array<{ url: string }>)[0].url).toMatch(/^https:\/\/luma\.com\//);
      }
    }
    expect(graph("index").some((node) => node["@type"] === "WebSite")).toBe(true);
    expect(graph("speakers").some((node) => node["@type"] === "Event")).toBe(false);
  });

  it("lists the Summit pages in the sitemap and keeps crawlers out of the community", () => {
    const urls = pages.map((page) => `https://82startup.com/${page === "index" ? "" : `${page}.html`}`);
    expect(sitemap().map((entry) => entry.url).sort()).toEqual(urls.sort());
    const rules = robots().rules as { disallow: string[] };
    for (const path of ["/members", "/messages", "/api/", "/admin"]) expect(rules.disallow).toContain(path);
    expect(robots().sitemap).toBe("https://82startup.com/sitemap.xml");
  });
});
