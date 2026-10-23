import { describe, expect, it } from "vitest";
import { initials, safeAvatarUrl } from "./avatar";

describe("safeAvatarUrl", () => {
  it("accepts https addresses on googleusercontent.com", () => {
    expect(safeAvatarUrl("https://lh3.googleusercontent.com/a/x=s96-c")).toBe("https://lh3.googleusercontent.com/a/x=s96-c");
    expect(safeAvatarUrl("https://googleusercontent.com/x")).toBe("https://googleusercontent.com/x");
  });

  it("rejects everything else", () => {
    for (const url of [
      "http://lh3.googleusercontent.com/x",
      "https://evil.example.com/x.png",
      "https://evil-googleusercontent.com/x",
      "https://googleusercontent.com.evil.example/x",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "//lh3.googleusercontent.com/x",
      "https://u:p@lh3.googleusercontent.com/x",
      "not a url",
      "",
    ]) {
      expect(safeAvatarUrl(url)).toBeNull();
    }
    expect(safeAvatarUrl(null)).toBeNull();
    expect(safeAvatarUrl(undefined)).toBeNull();
  });
});

describe("initials", () => {
  it("uses the first letter of the first and last word, upper-cased", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("ada  b  lovelace")).toBe("AL");
    expect(initials("Ada")).toBe("A");
    expect(initials("한국 창업")).toBe("한창");
  });

  it("shows a question mark when there is no name", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});
