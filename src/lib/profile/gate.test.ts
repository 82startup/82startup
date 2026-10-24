import { describe, expect, it } from "vitest";
import { cookieMatches, gateCookieValue, isGateOpenPath, setupRedirectPath } from "./gate";

const NOW = new Date("2026-11-01T00:00:00.000Z");
const SUB = "11111111-2222-3333-4444-555555555555";

describe("isGateOpenPath", () => {
  it("keeps the setup screen, sign-out, the sign-in return and API routes open", () => {
    for (const path of ["/profile", "/auth/callback", "/auth/signout", "/api/cron/luma-sync", "/api/webhooks/luma"]) {
      expect(isGateOpenPath(path)).toBe(true);
    }
  });
  it("gates every other page, including look-alikes", () => {
    for (const path of ["/", "/events", "/events/summit-abc", "/members", "/connections", "/messages", "/login", "/admin/events", "/profiles", "/profile/x", "/apiary", "/authors", "//evil.example"]) {
      expect(isGateOpenPath(path)).toBe(false);
    }
  });
});

describe("setupRedirectPath", () => {
  it("sends to the setup screen and remembers the wanted address, query included", () => {
    expect(setupRedirectPath("/events", "")).toBe("/profile?next=%2Fevents");
    expect(setupRedirectPath("/members", "?q=ada&page=2")).toBe("/profile?next=%2Fmembers%3Fq%3Dada%26page%3D2");
  });
  it("does not remember the home page or the login page", () => {
    expect(setupRedirectPath("/", "")).toBe("/profile");
    expect(setupRedirectPath("/login", "?next=/x")).toBe("/profile");
  });
});

describe("gate cookie", () => {
  it("matches the same member within its lifetime", () => {
    expect(cookieMatches(gateCookieValue(SUB, NOW), SUB, new Date(NOW.getTime() + 5 * 60_000))).toBe(true);
  });
  it("does not match after it expires, for another member, or when malformed", () => {
    const value = gateCookieValue(SUB, NOW);
    expect(cookieMatches(value, SUB, new Date(NOW.getTime() + 11 * 60_000))).toBe(false);
    expect(cookieMatches(value, "99999999-2222-3333-4444-555555555555", NOW)).toBe(false);
    for (const bad of [undefined, "", "garbage", `${SUB}`, `${SUB}:abc`, `:${NOW.getTime()}`, `${SUB}:${NOW.getTime() + 99 * 3600_000}`]) {
      expect(cookieMatches(bad, SUB, NOW)).toBe(false);
    }
  });
});
