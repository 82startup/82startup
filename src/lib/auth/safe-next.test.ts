import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps a local path with query", () => {
    expect(safeNextPath("/events/summit?tab=people")).toBe("/events/summit?tab=people");
  });
  it("falls back to / for empty values", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });
  it("rejects paths that do not start with a slash", () => {
    expect(safeNextPath("events")).toBe("/");
  });
});
