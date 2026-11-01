import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GATE_COOKIE, gateCookieValue } from "@/lib/profile/gate";

const getClaims = vi.fn();
const rpc = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn(() => ({ auth: { getClaims }, rpc })) }));
vi.mock("./env", () => ({ supabaseEnv: () => ({ url: "http://localhost", key: "key" }) }));

const { updateSession } = await import("./proxy");

const SUB = "11111111-2222-3333-4444-555555555555";
const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} });

beforeEach(() => {
  getClaims.mockReset();
  rpc.mockReset();
});

describe("updateSession gate", () => {
  it("sends a signed-out visitor from any community page to sign-in, remembering the page", async () => {
    getClaims.mockResolvedValue({ data: null });
    for (const [path, next] of [
      ["/events", "/events"],
      ["/events/82-startup-summit-2027-o8h0gkcl", "/events/82-startup-summit-2027-o8h0gkcl"],
      ["/events/submit", "/events/submit"],
      ["/members?q=ada", "/members?q=ada"],
      ["/members/abc", "/members/abc"],
      ["/messages/abc", "/messages/abc"],
      ["/connections", "/connections"],
      ["/profile", "/profile"],
      ["/settings", "/settings"],
      ["/admin/events", "/admin/events"],
      ["/speakers/person", "/speakers/person"],
      ["/sponsors", "/sponsors"],
    ] as const) {
      const res = await updateSession(req(path));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe(next);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lets a signed-out visitor reach sign-in, auth callbacks, APIs and unsubscribe links", async () => {
    getClaims.mockResolvedValue({ data: null });
    for (const path of ["/login?next=/members", "/auth/callback?code=x", "/auth/google", "/api/event-attendance", "/api/me", "/unsubscribe?t=x", "/eventsfoo"]) {
      const res = await updateSession(req(path));
      expect(res.headers.get("location")).toBeNull();
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends an incomplete member from any gated page to the setup screen, remembering the page", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: SUB } } });
    rpc.mockResolvedValue({ data: false, error: null });
    for (const [path, target] of [
      ["/events", "/profile?next=%2Fevents"],
      ["/members?q=ada", "/profile?next=%2Fmembers%3Fq%3Dada"],
      ["/", "/profile"],
      ["/messages/abc", "/profile?next=%2Fmessages%2Fabc"],
    ] as const) {
      const res = await updateSession(req(path));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname + new URL(res.headers.get("location")!).search).toBe(target);
    }
    expect(rpc).toHaveBeenCalledWith("profile_is_complete");
  });

  it("does not redirect an incomplete member away from the open addresses, and does not ask the database", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: SUB } } });
    rpc.mockResolvedValue({ data: false, error: null });
    for (const path of ["/profile", "/profile?next=/events", "/auth/signout", "/auth/callback?code=x", "/api/cron/luma-sync", "/api/webhooks/luma"]) {
      const res = await updateSession(req(path));
      expect(res.headers.get("location")).toBeNull();
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lets a complete member through and remembers it in a short-lived cookie", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: SUB } } });
    rpc.mockResolvedValue({ data: true, error: null });
    const res = await updateSession(req("/events"));
    expect(res.headers.get("location")).toBeNull();
    const cookie = res.cookies.get(GATE_COOKIE);
    expect(cookie?.value.startsWith(`${SUB}:`)).toBe(true);
    expect(cookie?.httpOnly).toBe(true);
  });

  it("skips the database when the cookie matches this member", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: SUB } } });
    const res = await updateSession(req("/events", `${GATE_COOKIE}=${encodeURIComponent(gateCookieValue(SUB, new Date()))}`));
    expect(res.headers.get("location")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks again when the cookie belongs to someone else or has expired", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: SUB } } });
    rpc.mockResolvedValue({ data: false, error: null });
    const other = gateCookieValue("99999999-2222-3333-4444-555555555555", new Date());
    const old = gateCookieValue(SUB, new Date(Date.now() - 20 * 60_000));
    for (const value of [other, old]) {
      const res = await updateSession(req("/events", `${GATE_COOKIE}=${encodeURIComponent(value)}`));
      expect(res.status).toBe(307);
    }
  });

  it("lets the page through when the check itself fails", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: SUB } } });
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    const res = await updateSession(req("/events"));
    expect(res.headers.get("location")).toBeNull();
  });
});
