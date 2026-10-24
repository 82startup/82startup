import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageList, type ThreadMessage } from "./message-list";

const msg = (over: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id: "m1",
  body: "Hello there",
  created_at: "2027-03-17T16:00:00.000Z",
  is_mine: false,
  is_unread: false,
  is_post: false,
  ...over,
});
const render = (messages: ThreadMessage[], name = "Bo B") => renderToStaticMarkup(createElement(MessageList, { messages, name }));

describe("MessageList", () => {
  it("says so when there are no messages", () => {
    expect(render([])).toContain("No messages yet");
  });

  it("labels each message with who sent it and keeps line breaks as text", () => {
    const html = render([msg({ body: "line one\nline two" }), msg({ id: "m2", is_mine: true, body: "mine" })]);
    expect(html).toContain("Bo B");
    expect(html).toContain("You");
    expect(html).toContain("whitespace-pre-line");
    expect(html).toContain("line one\nline two");
  });

  it("escapes markup in a message and does not turn links into anchors", () => {
    const html = render([msg({ body: '<script>alert(1)</script> <b>x</b> https://evil.example' })]);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<a ");
  });

  it("shows a Post label only on messages that came from a post", () => {
    const html = render([msg({ id: "a", is_post: true, body: "news" }), msg({ id: "b", body: "chat" })]);
    expect(html.match(/>Post</g)?.length).toBe(1);
  });

  it("breaks a very long unbroken word instead of overflowing", () => {
    expect(render([msg({ body: "x".repeat(500) })])).toContain("break-words");
  });
});
