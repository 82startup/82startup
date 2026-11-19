import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseRichText, RichText } from "./rich-text";

const html = (text: string) => renderToStaticMarkup(createElement(RichText, { text }));

describe("parseRichText", () => {
  it("marks **text** as bold and keeps the rest", () => {
    expect(parseRichText("Hi **UKF(United Korean Founders)** team")).toEqual([
      { kind: "text", text: "Hi " },
      { kind: "bold", text: "UKF(United Korean Founders)" },
      { kind: "text", text: " team" },
    ]);
  });

  it("leaves unmatched or multi-line stars as plain text", () => {
    expect(parseRichText("a ** b")).toEqual([{ kind: "text", text: "a ** b" }]);
    expect(parseRichText("**a\nb**")).toEqual([{ kind: "text", text: "**a\nb**" }]);
  });

  it("turns http(s) addresses into links and leaves trailing punctuation outside", () => {
    expect(parseRichText("🔗 UKF: https://www.ukf.net/en/.")).toEqual([
      { kind: "text", text: "🔗 UKF: " },
      { kind: "link", text: "https://www.ukf.net/en/", href: "https://www.ukf.net/en/" },
      { kind: "text", text: "." },
    ]);
  });

  it("does not link other schemes", () => {
    expect(parseRichText("javascript:alert(1) ftp://x.com")).toEqual([{ kind: "text", text: "javascript:alert(1) ftp://x.com" }]);
  });
});

describe("RichText", () => {
  it("renders strong and escapes markup", () => {
    expect(html("**<b>x</b>** <script>")).toBe("<strong>&lt;b&gt;x&lt;/b&gt;</strong> &lt;script&gt;");
  });

  it("renders a safe new-tab link", () => {
    expect(html("see https://ukf.net/a?b=1&c=2")).toBe(
      'see <a href="https://ukf.net/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer nofollow ugc">https://ukf.net/a?b=1&amp;c=2</a>',
    );
  });
});
