import { describe, expect, it } from "vitest";
import { formatPostDate } from "./format";

describe("board formatting", () => {
  it("formats a date in UTC", () => {
    expect(formatPostDate("2026-11-18T23:30:00Z")).toBe("Nov 18, 2026");
  });
});
