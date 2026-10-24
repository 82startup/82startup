import { describe, expect, it } from "vitest";
import { parseMarkReadForm, parseSendMessageForm } from "./form";

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe("parseSendMessageForm", () => {
  it("returns the member and the trimmed body, keeping inner line breaks", () => {
    expect(parseSendMessageForm(form({ member: ID, body: "  hi\nthere  " }))).toEqual({ member: ID, body: "hi\nthere" });
  });
  it("refuses a bad member id, an empty or spaces-only body, and a body over 2000 characters", () => {
    expect(parseSendMessageForm(form({ member: "nope", body: "hi" }))).toBeNull();
    expect(parseSendMessageForm(form({ body: "hi" }))).toBeNull();
    expect(parseSendMessageForm(form({ member: ID, body: "" }))).toBeNull();
    expect(parseSendMessageForm(form({ member: ID, body: "  \n " }))).toBeNull();
    expect(parseSendMessageForm(form({ member: ID, body: "x".repeat(2001) }))).toBeNull();
    expect(parseSendMessageForm(form({ member: ID, body: "x".repeat(2000) }))).not.toBeNull();
  });
  it("counts an emoji as one character", () => {
    expect(parseSendMessageForm(form({ member: ID, body: "😀".repeat(2000) }))).not.toBeNull();
  });
});

describe("parseMarkReadForm", () => {
  it("accepts a UUID and nothing else", () => {
    expect(parseMarkReadForm(form({ member: ID }))).toBe(ID);
    expect(parseMarkReadForm(form({ member: "../x" }))).toBeNull();
  });
});
