import { describe, expect, it } from "vitest";
import { lumaCode } from "./luma";

describe("lumaCode", () => {
  it("reads the code from a Luma link", () => {
    expect(lumaCode("https://luma.com/8faq28ez")).toBe("8faq28ez");
    expect(lumaCode("https://lu.ma/sell0ikl/")).toBe("sell0ikl");
  });

  it("ignores other sites and broken links", () => {
    expect(lumaCode("https://eventbrite.com/e/123")).toBe("");
    expect(lumaCode("https://notluma.com/abc")).toBe("");
    expect(lumaCode("not a link")).toBe("");
  });
});
