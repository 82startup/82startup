import { describe, expect, it } from "vitest";
import { parseDirectoryForm } from "./form";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe("parseDirectoryForm", () => {
  it("reads the checkbox: on means shown, absent or anything else means left out", () => {
    expect(parseDirectoryForm(form({ show_in_directory: "on" }))).toBe(true);
    expect(parseDirectoryForm(form({}))).toBe(false);
    expect(parseDirectoryForm(form({ show_in_directory: "yes" }))).toBe(false);
    expect(parseDirectoryForm(form({ show_in_directory: "true" }))).toBe(false);
  });
});
