import { describe, expect, it } from "vitest";
import { parseAttendForm } from "./attend";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

const ID = "11111111-2222-3333-4444-555555555555";

describe("parseAttendForm", () => {
  it("reads the event id, the page slug and true or false", () => {
    expect(parseAttendForm(form({ id: ID, slug: "ai-founders-meetup-a1b2c3d4", value: "true" }))).toEqual({
      id: ID,
      slug: "ai-founders-meetup-a1b2c3d4",
      value: true,
    });
    expect(parseAttendForm(form({ id: ID, slug: "event-x", value: "false" }))?.value).toBe(false);
  });

  it("rejects a missing or malformed id", () => {
    for (const id of ["", "abc", `${ID}x`, "1; drop table events"]) {
      expect(parseAttendForm(form({ id, slug: "event-x", value: "true" }))).toBeNull();
    }
  });

  it("rejects a slug that is not plain lowercase words joined by dashes (it ends up in a redirect)", () => {
    for (const slug of ["", "Event", "a/b", "../admin", "//evil.example.com", "a b", "-a", "a-", "a--b", "https://x.test"]) {
      expect(parseAttendForm(form({ id: ID, slug, value: "true" }))).toBeNull();
    }
  });

  it("rejects any value other than exactly true or false", () => {
    for (const value of ["", "yes", "1", "TRUE", "on"]) {
      expect(parseAttendForm(form({ id: ID, slug: "event-x", value }))).toBeNull();
    }
  });
});
