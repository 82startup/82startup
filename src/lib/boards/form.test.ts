import { describe, expect, it } from "vitest";
import { cleanBody, cleanComment, cleanTitle } from "./form";

describe("board form rules", () => {
  it("trims every kind of whitespace at both ends", () => {
    expect(cleanTitle("  \n Hello \t ")).toBe("Hello");
    expect(cleanBody("  text  ")).toBe("text");
  });
  it("refuses empty text", () => {
    expect(cleanTitle("   ")).toBeNull();
    expect(cleanBody("")).toBeNull();
    expect(cleanComment("\n")).toBeNull();
  });
  it("allows the limit and refuses one more, counting characters not bytes", () => {
    expect(cleanTitle("x".repeat(120))).not.toBeNull();
    expect(cleanTitle("x".repeat(121))).toBeNull();
    expect(cleanTitle("한".repeat(120))).not.toBeNull();
    expect(cleanBody("x".repeat(5000))).not.toBeNull();
    expect(cleanBody("x".repeat(5001))).toBeNull();
    expect(cleanComment("x".repeat(1000))).not.toBeNull();
    expect(cleanComment("x".repeat(1001))).toBeNull();
    expect(cleanTitle("😀".repeat(120))).not.toBeNull();
  });
  it("refuses a title that is only zero-width space, ideographic space or BOM", () => {
    expect(cleanTitle("​")).toBeNull();
    expect(cleanTitle(" 　")).toBeNull();
    expect(cleanTitle("﻿")).toBeNull();
  });
  it("trims zero-width space along with the other whitespace", () => {
    expect(cleanTitle("​ Hi 　")).toBe("Hi");
  });
});
