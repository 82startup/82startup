import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignupBar } from "./signup-bar";

const html = renderToStaticMarkup(createElement(SignupBar));

describe("SignupBar", () => {
  it("says what it is for and has an email box and a Sign up button", () => {
    expect(html).toContain("Sign up for the latest updates");
    expect(html).toMatch(/<input[^>]*type="email"[^>]*name="email"/);
    expect(html).toContain("Sign up");
  });

  it("sends the email to the Substack subscribe page in a new tab, with no script needed", () => {
    expect(html).toMatch(/<form[^>]*action="https:\/\/82startup\.substack\.com\/subscribe"/);
    expect(html).toMatch(/<form[^>]*method="get"/);
    expect(html).toMatch(/<form[^>]*target="_blank"/);
    expect(html).toMatch(/<form[^>]*rel="noopener"/);
  });

  it("has a Close button and is shown until it is closed", () => {
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain("sticky");
  });
});
