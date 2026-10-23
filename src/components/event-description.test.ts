import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventDescription } from "./event-description";

const render = (markdown: string, fallback = "") => renderToStaticMarkup(createElement(EventDescription, { markdown, fallback }));

describe("EventDescription", () => {
  it("draws paragraphs, bold text, a list and a link", () => {
    const html = render("Hello **world**\n\n- one\n- two\n\n[Luma](https://luma.com/x)");
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain('href="https://luma.com/x"');
  });

  it("opens links in a new tab without leaking the opener or the referrer", () => {
    const html = render("[x](https://example.com/)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it("drops raw HTML: scripts, iframes and event handlers never reach the page", () => {
    const html = render('Before <script>alert(1)</script> <iframe src="https://evil.example"></iframe> <img src=x onerror="alert(1)"> after');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("alert(1)\"");
    expect(html).toContain("Before");
    expect(html).toContain("after");
  });

  it("does not make a link out of a javascript: or data: address", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html;base64,PHNjcmlwdD4="]) {
      const html = render(`[click me](${href})`);
      expect(html).not.toContain("<a ");
      expect(html).not.toContain("javascript:");
      expect(html).toContain("click me");
    }
  });

  it("keeps a Luma picture, lazy and without a referrer", () => {
    const html = render("![Summit](https://images.lumacdn.com/uploads/oe/x.jpg)");
    expect(html).toContain('src="https://images.lumacdn.com/uploads/oe/x.jpg"');
    expect(html).toContain('alt="Summit"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('referrerPolicy="no-referrer"');
  });

  it("does not load a picture from anywhere else, and shows its alt text instead", () => {
    for (const src of ["https://evil.example.com/pixel.png", "http://images.lumacdn.com/x.jpg", "data:image/png;base64,AAAA", "javascript:alert(1)"]) {
      const html = render(`![tracking pixel](${src})`);
      expect(html).not.toContain("<img");
      expect(html).toContain("tracking pixel");
    }
  });

  it("moves headings down so the page keeps a single h1", () => {
    const html = render("# Title\n\n## Sub\n\n###### Deep");
    expect(html).not.toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).toContain("<h6");
  });

  it("keeps single line breaks as breaks", () => {
    expect(render("line one\nline two")).toContain("whitespace-pre-line");
  });

  it("shows the plain text when there is no markdown, and nothing when there is neither", () => {
    expect(render("", "Plain text here")).toContain("Plain text here");
    expect(render("   \n", "Plain text here")).toContain("Plain text here");
    expect(render("", "")).toBe("");
  });

  it("handles a very long description without trouble", () => {
    const html = render(("Paragraph with some words.\n\n").repeat(3000));
    expect(html.length).toBeGreaterThan(50000);
  });
});
