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

describe("safeAvatarUrl with this project's own bucket", () => {
  const own = "https://proj.supabase.co";

  it("accepts a photo in the avatars bucket of this project", () => {
    const url = `${own}/storage/v1/object/public/avatars/u/p.jpg`;
    expect(safeAvatarUrl(url, own)).toBe(url);
  });

  it("rejects other buckets, other hosts, look-alikes, credentials and paths that only start the same", () => {
    for (const url of [
      `${own}/storage/v1/object/public/other/u/p.jpg`,
      `${own}/storage/v1/object/public/avatars-evil/u/p.jpg`,
      `${own}/storage/v1/object/sign/avatars/u/p.jpg`,
      `${own}/rest/v1/profiles`,
      "https://proj.supabase.co.evil.example/storage/v1/object/public/avatars/u/p.jpg",
      "https://evilproj.supabase.co/storage/v1/object/public/avatars/u/p.jpg",
      "http://proj.supabase.co/storage/v1/object/public/avatars/u/p.jpg",
      "https://u:p@proj.supabase.co/storage/v1/object/public/avatars/u/p.jpg",
    ]) {
      expect(safeAvatarUrl(url, own)).toBeNull();
    }
  });

  it("accepts its own bucket on a local http address (development)", () => {
    const local = "http://127.0.0.1:55321";
    const url = `${local}/storage/v1/object/public/avatars/u/p.jpg`;
    expect(safeAvatarUrl(url, local)).toBe(url);
  });

  it("does not accept the bucket path when no own address is configured", () => {
    expect(safeAvatarUrl(`${own}/storage/v1/object/public/avatars/u/p.jpg`, undefined)).toBeNull();
    expect(safeAvatarUrl(`${own}/storage/v1/object/public/avatars/u/p.jpg`, "")).toBeNull();
  });

  it("still accepts Google pictures", () => {
    expect(safeAvatarUrl("https://lh3.googleusercontent.com/a/x", own)).toBe("https://lh3.googleusercontent.com/a/x");
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
