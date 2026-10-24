import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Turnstile } from "./turnstile";

afterEach(() => vi.unstubAllEnvs());

describe("Turnstile", () => {
  it("shows nothing when no site key is set", () => {
    expect(renderToStaticMarkup(createElement(Turnstile))).toBe("");
  });

  it("leaves a container for the check when a site key is set", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    expect(renderToStaticMarkup(createElement(Turnstile))).toContain("<div");
  });
});
