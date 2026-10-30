import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = Date.parse("2027-03-17T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("relativeTime", () => {
  it("rounds down to the largest whole unit", () => {
    expect(relativeTime(ago(20_000), NOW)).toBe("now");
    expect(relativeTime(ago(5 * 60_000), NOW)).toBe("5m");
    expect(relativeTime(ago(3 * 3_600_000), NOW)).toBe("3h");
    expect(relativeTime(ago(2 * 86_400_000), NOW)).toBe("2d");
    expect(relativeTime(ago(15 * 86_400_000), NOW)).toBe("2w");
    expect(relativeTime(ago(400 * 86_400_000), NOW)).toBe("1y");
  });

  it("treats a future time as now and a bad date as empty", () => {
    expect(relativeTime(ago(-60_000), NOW)).toBe("now");
    expect(relativeTime("not a date", NOW)).toBe("");
  });
});
