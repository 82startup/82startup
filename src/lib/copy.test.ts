import { describe, expect, it } from "vitest";
import { copy, loginErrorText } from "./copy";

describe("loginErrorText", () => {
  it("returns the text for a known code", () => {
    expect(loginErrorText("send")).toBe(copy.login.errors.send);
  });
  it("returns null for unknown codes, prototype keys and null", () => {
    for (const code of ["toString", "__proto__", "constructor", "nope", null]) {
      expect(loginErrorText(code)).toBeNull();
    }
  });
});
