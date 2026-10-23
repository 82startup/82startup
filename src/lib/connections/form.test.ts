import { describe, expect, it } from "vitest";
import { parseIdForm, parseMemberForm, parseSendForm } from "./form";

const ID = "11111111-2222-3333-4444-555555555555";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe("parseSendForm", () => {
  it("returns the member and a trimmed note", () => {
    expect(parseSendForm(form({ member: ID, note: "  hi  " }))).toEqual({ member: ID, note: "hi" });
    expect(parseSendForm(form({ member: ID }))).toEqual({ member: ID, note: "" });
  });
  it("refuses a bad member id or a note over 200 characters", () => {
    expect(parseSendForm(form({ member: "nope" }))).toBeNull();
    expect(parseSendForm(form({}))).toBeNull();
    expect(parseSendForm(form({ member: ID, note: "x".repeat(201) }))).toBeNull();
    expect(parseSendForm(form({ member: ID, note: "x".repeat(200) }))).not.toBeNull();
  });
});

describe("parseMemberForm / parseIdForm", () => {
  it("accept a UUID and nothing else", () => {
    expect(parseMemberForm(form({ member: ID }))).toBe(ID);
    expect(parseMemberForm(form({ member: ID + "x" }))).toBeNull();
    expect(parseIdForm(form({ id: ID }))).toBe(ID);
    expect(parseIdForm(form({ id: "../x" }))).toBeNull();
    expect(parseIdForm(form({}))).toBeNull();
  });
});
