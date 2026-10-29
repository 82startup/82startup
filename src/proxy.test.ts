import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn(() => NextResponse.next()) }));
import { updateSession } from "@/lib/supabase/proxy";
import { proxy } from "./proxy";

describe("Summit launch routing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serves Summit pages and assets without session/profile checks, even with cookies", async () => {
    for (const path of ["/", "/index.html", "/schedule.html?day=19", "/speakers.html", "/venue.html", "/tickets.html", "/app.js", "/event-data.js", "/style.css", "/assets/event-photos/photo.webp", "/venue-map/index.html?preview=1", "/licenses/three.txt"]) {
      const response = await proxy(new NextRequest(`https://example.com${path}`, { headers: { cookie: "sb-session=existing-session" } }));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("routes community screens through session refresh instead of the retired launch gate", async () => {
    const paths = ["/events", "/events/submit", "/members/123", "/connections", "/messages/123", "/profile", "/settings", "/login?next=/members", "/admin/events", "/speakers/person", "/sponsors"];
    for (const path of paths) {
      const response = await proxy(new NextRequest(`https://example.com${path}`));
      expect(response.headers.get("location")).toBeNull();
    }
    expect(updateSession).toHaveBeenCalledTimes(paths.length);
  });

  it("preserves existing backend, auth and unsubscribe routing", async () => {
    for (const path of ["/api/webhooks/luma", "/api/cron/luma-sync", "/auth/callback", "/auth/signout", "/unsubscribe"]) {
      await proxy(new NextRequest(`https://example.com${path}`));
    }
    expect(updateSession).toHaveBeenCalledTimes(5);
  });
});
