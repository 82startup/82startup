import { describe, expect, it } from "vitest";
import { ZONES, localToUtc, offsetMinutesOf, utcToLocalInput, zoneForOffset } from "./tz";

describe("offsetMinutesOf", () => {
  it("reads the offset at the end of an ISO date-time", () => {
    expect(offsetMinutesOf("2027-03-17T09:00:00-07:00")).toBe(-420);
    expect(offsetMinutesOf("2027-03-17T09:00:00+09:00")).toBe(540);
    expect(offsetMinutesOf("2027-03-17T09:00:00+0530")).toBe(330);
    expect(offsetMinutesOf("2027-03-17T09:00:00Z")).toBe(0);
  });
  it("returns null when there is no offset (the zone is not known)", () => {
    expect(offsetMinutesOf("2027-03-17T09:00:00")).toBeNull();
    expect(offsetMinutesOf("2027-03-17")).toBeNull();
    expect(offsetMinutesOf("not a date")).toBeNull();
  });
});

describe("localToUtc and utcToLocalInput", () => {
  it("turns a wall-clock time in a zone into UTC, with daylight saving", () => {
    expect(localToUtc("2027-03-17T09:00", "America/Los_Angeles")).toBe("2027-03-17T16:00:00.000Z"); // PDT, UTC-7
    expect(localToUtc("2027-01-17T09:00", "America/Los_Angeles")).toBe("2027-01-17T17:00:00.000Z"); // PST, UTC-8
    expect(localToUtc("2027-03-17T09:00", "Asia/Seoul")).toBe("2027-03-17T00:00:00.000Z");
    expect(localToUtc("2027-03-17T09:00", "UTC")).toBe("2027-03-17T09:00:00.000Z");
  });
  it("turns UTC back into the wall-clock value of a date-time field", () => {
    expect(utcToLocalInput("2027-03-17T16:00:00.000Z", "America/Los_Angeles")).toBe("2027-03-17T09:00");
    expect(utcToLocalInput("2027-03-17T00:00:00.000Z", "Asia/Seoul")).toBe("2027-03-17T09:00");
  });
  it("round-trips", () => {
    for (const zone of ZONES) {
      expect(localToUtc(utcToLocalInput("2027-07-04T12:30:00.000Z", zone), zone)).toBe("2027-07-04T12:30:00.000Z");
    }
  });
  it("refuses a value that is not a date-time or a zone that does not exist", () => {
    expect(localToUtc("nope", "UTC")).toBeNull();
    expect(localToUtc("2027-13-45T99:99", "UTC")).toBeNull();
    expect(localToUtc("2027-03-17T09:00", "Mars/Base")).toBeNull();
  });
});

describe("zoneForOffset", () => {
  it("picks a zone from the list that has that offset on that day", () => {
    expect(zoneForOffset(-420, "2027-03-17T16:00:00.000Z")).toBe("America/Los_Angeles");
    expect(zoneForOffset(540, "2027-03-17T00:00:00.000Z")).toBe("Asia/Seoul");
    expect(zoneForOffset(0, "2027-01-17T12:00:00.000Z")).toBe("UTC");
  });
  it("falls back to UTC for an offset no zone in the list has, or an unknown one", () => {
    expect(zoneForOffset(123, "2027-03-17T00:00:00.000Z")).toBe("UTC");
    expect(zoneForOffset(null, "2027-03-17T00:00:00.000Z")).toBe("UTC");
  });
  it("offers only zones the database knows", () => {
    expect(ZONES).toContain("UTC");
    expect(ZONES).toContain("Asia/Seoul");
    expect(new Set(ZONES).size).toBe(ZONES.length);
  });
});
