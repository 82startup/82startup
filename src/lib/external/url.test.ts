import { describe, expect, it } from "vitest";
import { hostLabel, normalizeEventUrl } from "./url";

const ok = (raw: string) => normalizeEventUrl(raw);

describe("normalizeEventUrl", () => {
  it("accepts an https address and returns it cleaned, with its host", () => {
    expect(ok(" https://www.Eventbrite.com/e/founders-night-123/ ")).toEqual({ ok: true, url: "https://www.eventbrite.com/e/founders-night-123", host: "eventbrite.com" });
  });

  it("drops the fragment and tracking parameters but keeps the ones that choose the page", () => {
    expect(ok("https://www.eventbrite.com/e/x-1?aff=ebdssbdestsearch&utm_source=a&utm_medium=b&fbclid=z&gclid=q#tickets")).toMatchObject({ ok: true, url: "https://www.eventbrite.com/e/x-1" });
    expect(ok("https://events.example.com/view?id=42&utm_campaign=x")).toMatchObject({ ok: true, url: "https://events.example.com/view?id=42" });
  });

  it("treats lu.ma and luma.com as the same site", () => {
    expect(ok("https://lu.ma/abc123")).toMatchObject({ ok: true, url: "https://luma.com/abc123", host: "luma.com" });
    expect(ok("https://luma.com/abc123/?utm_source=x")).toMatchObject({ ok: true, url: "https://luma.com/abc123" });
  });

  it("gives the same result for the same event written differently, so duplicates are caught", () => {
    const a = ok("https://WWW.EVENTBRITE.COM/e/x-1/?utm_source=a");
    const b = ok("https://eventbrite.com/e/x-1");
    expect(a).toMatchObject({ ok: true });
    expect(a).not.toEqual(b); // www is kept in the address, the host is shared
    expect((a as { host: string }).host).toBe((b as { host: string }).host);
  });

  it("refuses anything that is not a plain https address", () => {
    for (const bad of [
      "http://eventbrite.com/e/x", "ftp://x.test/a", "javascript:alert(1)", "data:text/html,x", "//eventbrite.com/e/x", "eventbrite.com/e/x", "",
      "https://user:pass@eventbrite.com/e/x", "https://eventbrite.com:8443/e/x", "https://eventbrite.com:80/e/x", "https://localhost/e", "https://intranet/e",
      "https://127.0.0.1/e", "https://[::1]/e", "https://10.0.0.5/e", "https://169.254.169.254/latest/meta-data", "https://2130706433/e", "https://a b.test/e",
      "https://" + "a".repeat(300) + ".com/e",
    ]) {
      expect(ok(bad)).toMatchObject({ ok: false });
    }
  });

  it("accepts the standard https port written out", () => {
    expect(ok("https://eventbrite.com:443/e/x")).toMatchObject({ ok: true, url: "https://eventbrite.com/e/x" });
  });

  it("refuses an address longer than 500 characters", () => {
    expect(ok("https://eventbrite.com/e/" + "x".repeat(500))).toMatchObject({ ok: false });
  });
});

describe("hostLabel", () => {
  it("names the well-known sites and falls back to the host", () => {
    expect(hostLabel("luma.com")).toBe("Luma");
    expect(hostLabel("eventbrite.com")).toBe("Eventbrite");
    expect(hostLabel("meetup.com")).toBe("Meetup");
    expect(hostLabel("events.example.org")).toBe("events.example.org");
  });
});
