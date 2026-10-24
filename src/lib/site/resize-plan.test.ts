import { describe, expect, it } from "vitest";
import { MAX_TARGET_BYTES, attemptsFor, fitWithin, keepsAsIs } from "./resize-plan";

describe("fitWithin", () => {
  it("scales a picture down to fit, keeping its proportions", () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 });
    expect(fitWithin(2000, 2000, 800)).toEqual({ width: 800, height: 800 });
  });
  it("never makes a picture bigger", () => {
    expect(fitWithin(300, 200, 1000)).toEqual({ width: 300, height: 200 });
    expect(fitWithin(1000, 1000, 1000)).toEqual({ width: 1000, height: 1000 });
  });
  it("keeps at least one pixel on the short side", () => {
    expect(fitWithin(10000, 1, 800)).toEqual({ width: 800, height: 1 });
  });
});

describe("attemptsFor", () => {
  it("tries a speaker photo as JPEG, from good quality to smaller and smaller", () => {
    const list = attemptsFor("speakers");
    expect(list.every((a) => a.type === "image/jpeg")).toBe(true);
    expect(list[0].max).toBe(1000);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      expect(list[i].max <= prev.max).toBe(true);
      expect(list[i].quality <= prev.quality || list[i].max < prev.max).toBe(true);
    }
    expect(list[list.length - 1].max).toBeLessThanOrEqual(600);
  });

  it("tries a logo as PNG first (it keeps transparency), then WebP, then smaller", () => {
    const list = attemptsFor("sponsors");
    expect(list[0]).toMatchObject({ type: "image/png", max: 800 });
    expect(list.some((a) => a.type === "image/webp")).toBe(true);
    expect(list.every((a) => ["image/png", "image/webp"].includes(a.type))).toBe(true);
    expect(list[list.length - 1].max).toBeLessThanOrEqual(400);
  });

  it("aims below the 500 KB limit with some room", () => {
    expect(MAX_TARGET_BYTES).toBeLessThan(512000);
    expect(MAX_TARGET_BYTES).toBeGreaterThan(400000);
  });
});

describe("keepsAsIs", () => {
  it("keeps a logo that is already small enough, so its transparency and quality are untouched", () => {
    expect(keepsAsIs("sponsors", { size: 50_000, width: 400, height: 120 })).toBe(true);
    expect(keepsAsIs("sponsors", { size: MAX_TARGET_BYTES, width: 800, height: 300 })).toBe(true);
  });
  it("shrinks a logo that is too heavy or too large in pixels", () => {
    expect(keepsAsIs("sponsors", { size: MAX_TARGET_BYTES + 1, width: 400, height: 120 })).toBe(false);
    expect(keepsAsIs("sponsors", { size: 50_000, width: 3000, height: 900 })).toBe(false);
  });
  it("always redraws a speaker photo, which also drops the hidden camera data (location, device)", () => {
    expect(keepsAsIs("speakers", { size: 10_000, width: 300, height: 300 })).toBe(false);
  });
});
