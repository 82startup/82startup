import { describe, expect, it } from "vitest";
import { countText } from "./text";

describe("countText", () => {
  it("uses the singular for one and the plural otherwise, including zero", () => {
    expect(countText("Sent to {n} connections", "Sent to 1 connection", 1)).toBe("Sent to 1 connection");
    expect(countText("Sent to {n} connections", "Sent to 1 connection", 40)).toBe("Sent to 40 connections");
    expect(countText("Sent to {n} connections", "Sent to 1 connection", 0)).toBe("Sent to 0 connections");
  });
});
