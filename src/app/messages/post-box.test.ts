import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./post-actions", () => ({ createPost: vi.fn() }));

const { PostBox } = await import("./post-box");

const render = (props: { connectionCount: number; postsLeft: number; nextAt: string | null }) => renderToStaticMarkup(createElement(PostBox, props));

describe("PostBox", () => {
  it("shows nothing with no connections", () => {
    expect(render({ connectionCount: 0, postsLeft: 5, nextAt: null })).toBe("");
  });

  it("shows the box with how many people it will reach", () => {
    const html = render({ connectionCount: 12, postsLeft: 3, nextAt: null });
    expect(html).toContain("Post to my connections");
    expect(html).toContain("<textarea");
    expect(html).toContain("12 connections");
    expect(html).toContain("Post</button>");
  });

  it("says when the limit is reached and when posting works again, with no box", () => {
    const html = render({ connectionCount: 12, postsLeft: 0, nextAt: "2027-03-18T16:00:00.000Z" });
    expect(html).toContain("limit of 5 posts in 24 hours");
    expect(html).toContain("Mar 18");
    expect(html).not.toContain("<textarea");
  });
});
