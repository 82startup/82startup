import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("public landing release", () => {
  it.each(["index", "schedule", "speakers", "venue", "tickets"])("%s serves crawlable content and the selected social image", (page) => {
    const html = read(`public/${page}.html`);
    expect(html).toContain(`data-prerendered="${page}"`);
    expect(html).toContain('<main id="main"');
    expect(html).toMatch(/<h1>/);
    expect(html).toContain('property="og:image" content="https://82startup.vercel.app/assets/og-startup-week-2027-zen-dots.jpg"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    if (page !== "index") expect(html).not.toContain('<script src="glyph-ember-preview.js');
  });

  it("changes only the home display range and keeps the event facts and checkout destinations", () => {
    const home = read("public/index.html");
    expect(home).toContain("MARCH 15—21, 2027 / SF BAY AREA");
    expect(home).toContain("<strong>March 15—21, 2027</strong>");
    expect(read("public/tickets.html")).toContain("MARCH 16—19, 2027");
    const events = read("public/event-data.js");
    for (const destination of ["8faq28ez", "sell0ikl", "9qj9ujht", "6vy0xhk9", "yu4fof7p"]) {
      expect(events).toContain(`https://luma.com/${destination}`);
      expect(home).toContain(`https://luma.com/${destination}`);
    }
  });

  it("keeps the map and all extracted plan assets available without embedded JPEG payloads", () => {
    const map = read("public/venue-map/index.html");
    expect(map).not.toContain("data:image/jpeg;base64,");
    expect(map).toContain('src="vendor/three-r128.min.js"');
    const plans = [...map.matchAll(/assets\/plan-[a-f0-9]+\.webp/g)];
    expect(plans.length).toBe(30);
    for (const [plan] of plans) expect(existsSync(resolve(root, "public/venue-map", plan))).toBe(true);
    expect(read("public/venue-map/vendor/three-r128.min.js")).toContain("Copyright 2010-2021 Three.js Authors");
  });
});
