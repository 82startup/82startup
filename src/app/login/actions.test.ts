import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOtp = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://82startup.vercel.app" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithOtp } }) }));

const { signInWithEmail } = await import("./actions");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

beforeEach(() => {
  signInWithOtp.mockReset();
  signInWithOtp.mockResolvedValue({ error: null });
  redirect.mockClear();
  vi.unstubAllEnvs();
});

describe("signInWithEmail and the CAPTCHA", () => {
  it("sends the Turnstile token to Supabase with the email", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    await expect(signInWithEmail(form({ email: "a@x.test", next: "/", "cf-turnstile-response": "tok" }))).rejects.toThrow("NEXT_REDIRECT:/login?sent=1");
    expect(signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "a@x.test", options: expect.objectContaining({ captchaToken: "tok" }) }));
  });

  it("goes back with a CAPTCHA message, without calling Supabase, when the check is on and there is no token", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    await expect(signInWithEmail(form({ email: "a@x.test", next: "/events" }))).rejects.toThrow("NEXT_REDIRECT:/login?error=captcha&next=%2Fevents");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("goes back with a CAPTCHA message when Supabase refuses the token", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    signInWithOtp.mockResolvedValue({ error: { code: "captcha_failed", message: "captcha protection: request disallowed" } });
    await expect(signInWithEmail(form({ email: "a@x.test", next: "/", "cf-turnstile-response": "bad" }))).rejects.toThrow("NEXT_REDIRECT:/login?error=captcha");
  });

  it("keeps working as before when no site key is set (local development): no token is needed or sent", async () => {
    await expect(signInWithEmail(form({ email: "a@x.test", next: "/" }))).rejects.toThrow("NEXT_REDIRECT:/login?sent=1");
    expect(signInWithOtp.mock.calls[0][0].options.captchaToken).toBeUndefined();
  });

  it("still reports other send errors as before", async () => {
    signInWithOtp.mockResolvedValue({ error: { code: "over_email_send_rate_limit", message: "rate" } });
    await expect(signInWithEmail(form({ email: "a@x.test", next: "/" }))).rejects.toThrow("NEXT_REDIRECT:/login?error=send");
  });
});
