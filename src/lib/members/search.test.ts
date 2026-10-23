import { describe, expect, it } from "vitest";
import { PAGE_SIZE, parseMemberSearch } from "./search";

describe("parseMemberSearch", () => {
  it("trims the text and reads a valid type and page", () => {
    expect(parseMemberSearch({ q: "  Bo  ", type: "investor", page: "3" })).toEqual({ q: "Bo", type: "investor", page: 3 });
  });

  it("uses the first item when a value is repeated", () => {
    expect(parseMemberSearch({ q: ["ann", "bob"], type: ["startup", "investor"], page: ["2", "5"] })).toEqual({
      q: "ann",
      type: "startup",
      page: 2,
    });
  });

  it("cuts the text at 80 characters", () => {
    expect(parseMemberSearch({ q: "x".repeat(200) }).q).toHaveLength(80);
  });

  it("falls back to no type for an unknown or missing type", () => {
    for (const type of ["wizard", "", "STARTUP", undefined]) {
      expect(parseMemberSearch({ type }).type).toBeNull();
    }
    expect(parseMemberSearch({}).type).toBeNull();
  });

  it("accepts each real member type", () => {
    for (const type of ["startup", "investor", "student", "corporate", "institution", "other"]) {
      expect(parseMemberSearch({ type }).type).toBe(type);
    }
  });

  it("falls back to page 1 for anything that is not a whole number from 1 to 1000", () => {
    for (const page of ["0", "-2", "abc", "1.5", "", "99999999999", "1001", undefined]) {
      expect(parseMemberSearch({ page }).page).toBe(1);
    }
    expect(parseMemberSearch({ page: "1000" }).page).toBe(1000);
  });

  it("defaults to no text, no type and page 1, and uses pages of 24", () => {
    expect(parseMemberSearch({})).toEqual({ q: "", type: null, page: 1 });
    expect(PAGE_SIZE).toBe(24);
  });
});
