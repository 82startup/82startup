import { describe, expect, it } from "vitest";
import { parsePostForm } from "./form";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe("parsePostForm", () => {
  it("returns the trimmed body, keeping inner line breaks", () => {
    expect(parsePostForm(form({ body: "  Big\nnews  " }))).toBe("Big\nnews");
  });
  it("refuses an empty or spaces-only body and one over 2000 characters", () => {
    expect(parsePostForm(form({}))).toBeNull();
    expect(parsePostForm(form({ body: "" }))).toBeNull();
    expect(parsePostForm(form({ body: " \n " }))).toBeNull();
    expect(parsePostForm(form({ body: "x".repeat(2001) }))).toBeNull();
    expect(parsePostForm(form({ body: "x".repeat(2000) }))).not.toBeNull();
  });
  it("counts an emoji as one character", () => {
    expect(parsePostForm(form({ body: "😀".repeat(2000) }))).not.toBeNull();
  });
});
