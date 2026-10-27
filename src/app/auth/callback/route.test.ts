import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession } }) }));
const { GET } = await import("./route");
beforeEach(() => { exchangeCodeForSession.mockReset(); });

describe("OAuth callback preserves the browser origin", () => {
  it("uses a relative redirect after exchanging a code, even if Next rewrote the internal origin", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new Request("http://localhost:3001/auth/callback?code=test-code&next=%2Fevents", { headers: { host: "127.0.0.1:3001" } }));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/events");
  });
  it("keeps the error redirect on the browser origin too", async () => {
    const response = await GET(new Request("http://localhost:3001/auth/callback", { headers: { host: "127.0.0.1:3001" } }));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("/login?error=auth");
  });
  it("rejects an external next destination", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new Request("http://localhost:3001/auth/callback?code=test-code&next=https%3A%2F%2Fexample.com"));
    expect(response.headers.get("location")).toBe("/");
  });
});
