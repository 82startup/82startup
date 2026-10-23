import { describe, expect, it } from "vitest";
import { safeImageUrl, safeLinkUrl, shiftedHeading } from "./markdown";

describe("safeLinkUrl", () => {
  it("accepts https, http and mailto", () => {
    expect(safeLinkUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeLinkUrl("http://example.com/")).toBe("http://example.com/");
    expect(safeLinkUrl("mailto:hello@example.com")).toBe("mailto:hello@example.com");
  });

  it("rejects every other kind of address", () => {
    for (const href of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      " javascript:alert(1)",
      "java\nscript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://example.com/x",
      "/relative/path",
      "//example.com/x",
      "#anchor",
      "not a url",
      "",
    ]) {
      expect(safeLinkUrl(href)).toBeNull();
    }
    expect(safeLinkUrl(null)).toBeNull();
    expect(safeLinkUrl(undefined)).toBeNull();
  });
});

describe("safeImageUrl", () => {
  it("accepts https pictures on Luma's own picture hosts", () => {
    expect(safeImageUrl("https://images.lumacdn.com/cdn-cgi/image/width=800/uploads/oe/x.jpg")).toBe(
      "https://images.lumacdn.com/cdn-cgi/image/width=800/uploads/oe/x.jpg",
    );
    expect(safeImageUrl("https://cdn.lu.ma/avatars-default/a.png")).toBe("https://cdn.lu.ma/avatars-default/a.png");
  });

  it("rejects other hosts, http, look-alikes, credentials and non-addresses", () => {
    for (const src of [
      "https://evil.example.com/x.jpg",
      "http://images.lumacdn.com/x.jpg",
      "https://images.lumacdn.com.evil.example/x.jpg",
      "https://evil-lumacdn.com/x.jpg",
      "https://notimages.lumacdn.com/x.jpg",
      "https://u:p@images.lumacdn.com/x.jpg",
      "//images.lumacdn.com/x.jpg",
      "data:image/png;base64,AAAA",
      "javascript:alert(1)",
      "/uploads/x.jpg",
      "",
    ]) {
      expect(safeImageUrl(src)).toBeNull();
    }
    expect(safeImageUrl(null)).toBeNull();
    expect(safeImageUrl(undefined)).toBeNull();
  });
});

describe("shiftedHeading", () => {
  it("moves each level down by one and never goes past h6", () => {
    expect([1, 2, 3, 4, 5, 6].map(shiftedHeading)).toEqual(["h2", "h3", "h4", "h5", "h6", "h6"]);
  });
});
