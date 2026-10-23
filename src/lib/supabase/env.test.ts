import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("supabaseEnv", () => {
  it("returns url and key when both are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(supabaseEnv()).toEqual({ url: "http://127.0.0.1:55321", key: "sb_publishable_test" });
  });
  it("throws a clear error when a variable is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => supabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
