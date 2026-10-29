import { describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithOAuth } }) }));
const { GET } = await import("./route");

describe("Google OAuth start URL", () => {
  it("uses the browser host instead of Next's internal origin", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: "https://auth.example.test/authorize" }, error: null });
    const response = await GET(new Request("http://localhost:3000/auth/google?next=%2Fevents", {
      headers: { host: "127.0.0.1:3000" },
    }));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://127.0.0.1:3000/auth/callback?next=%2Fevents" },
    });
    expect(response.headers.get("location")).toBe("https://auth.example.test/authorize");
  });
});
