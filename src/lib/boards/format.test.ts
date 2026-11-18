import { describe, expect, it } from "vitest";
import { formatPostDate, previewText } from "./format";

describe("board formatting", () => {
  it("formats a date in UTC", () => {
    expect(formatPostDate("2026-11-18T23:30:00Z")).toBe("Nov 18, 2026");
  });
  it("collapses whitespace in a preview and cuts long text with an ellipsis", () => {
    expect(previewText("a \n\n b   c", 50)).toBe("a b c");
    expect(previewText("x".repeat(10), 5)).toBe("xxxx…");
    expect(previewText("short", 5)).toBe("short");
  });
});
