import { describe, expect, it } from "vitest";
import { parseNotificationForm, parseUnsubscribeParams } from "./form";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe("parseNotificationForm", () => {
  it("reads each checkbox: on means ticked, absent means not", () => {
    expect(parseNotificationForm(form({ connection_requests: "on", messages: "on" }))).toEqual({
      requests: true, accepted: false, messages: true, posts: false,
    });
    expect(parseNotificationForm(form({}))).toEqual({ requests: false, accepted: false, messages: false, posts: false });
    expect(parseNotificationForm(form({ posts: "yes" }))).toEqual({ requests: false, accepted: false, messages: false, posts: false });
  });
});

describe("parseUnsubscribeParams", () => {
  const code = "0123456789abcdef".repeat(4);
  it("accepts a 64-character hex code with a known kind", () => {
    for (const kind of ["connection_request", "connection_accepted", "message", "post", "all"]) {
      expect(parseUnsubscribeParams(code, kind)).toEqual({ code, kind });
    }
  });
  it("refuses anything else", () => {
    for (const [c, k] of [[code, "bogus"], ["abc", "all"], [code.toUpperCase(), "all"], [code + "0", "all"], [undefined, "all"], [code, undefined], ["", ""]] as const) {
      expect(parseUnsubscribeParams(c, k)).toBeNull();
    }
  });
});
