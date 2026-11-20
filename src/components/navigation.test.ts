import { describe, expect, it } from "vitest";
import { buildNavigation } from "./navigation";

describe("buildNavigation", () => {
  it("is the existing menu, in order, when there are no boards", () => {
    expect(buildNavigation([]).map(({ href, marker }) => [href, marker])).toEqual([
      ["/members", "01"], ["/events", "02"], ["/connections", "03"], ["/messages", "04"],
      ["/profile", "05"], ["/settings", "06"], ["/admin/events", "07"],
    ]);
  });
  it("puts one entry per board after Week 2027 and renumbers the rest", () => {
    const items = buildNavigation([{ slug: "showcase", title: "Startup Showcase" }, { slug: "jobs", title: "Jobs" }]);
    expect(items.map(({ href, label, marker }) => [href, label, marker])).toEqual([
      ["/members", "Members", "01"], ["/events", "Week 2027", "02"],
      ["/boards/showcase", "Startup Showcase", "03"], ["/boards/jobs", "Jobs", "04"],
      ["/connections", "Connections", "05"], ["/messages", "Messages", "06"],
      ["/profile", "My profile", "07"], ["/settings", "Settings", "08"], ["/admin/events", "Admin", "09"],
    ]);
  });
  it("gives Week 2027 and Startup-prefixed boards a short mobile label", () => {
    const items = buildNavigation([{ slug: "showcase", title: "Startup Showcase" }, { slug: "jobs", title: "Jobs" }]);
    expect(items.slice(0, 4).map(({ shortLabel }) => shortLabel)).toEqual([undefined, "Week", "Showcase", undefined]);
  });
});
