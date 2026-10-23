import { describe, expect, it } from "vitest";
import { parseProfileForm } from "./schema";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseProfileForm", () => {
  it("accepts a complete profile and trims text", () => {
    const result = parseProfileForm(
      form({
        name: "  Ada Lee ",
        headline: "Founder at Acme",
        company_name: "Acme",
        bio: "Hello",
        linkedin_url: "https://www.linkedin.com/in/ada",
        member_type: "founder",
      }),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Ada Lee",
        headline: "Founder at Acme",
        company_name: "Acme",
        bio: "Hello",
        linkedin_url: "https://www.linkedin.com/in/ada",
        member_type: "founder",
      },
    });
  });

  it("treats an empty LinkedIn URL and an empty member type as null", () => {
    const result = parseProfileForm(form({ name: "Ada", linkedin_url: "", member_type: "" }));
    expect(result).toMatchObject({ ok: true, value: { linkedin_url: null, member_type: null } });
  });

  it("requires a name", () => {
    const result = parseProfileForm(form({ name: "   " }));
    expect(result).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
  });

  it("rejects too-long fields", () => {
    const result = parseProfileForm(
      form({ name: "x".repeat(101), headline: "h".repeat(121), company_name: "c".repeat(101), bio: "b".repeat(1001) }),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: expect.any(String),
        headline: expect.any(String),
        company_name: expect.any(String),
        bio: expect.any(String),
      },
    });
  });

  it("rejects a LinkedIn URL that is not on linkedin.com over https", () => {
    for (const bad of ["http://www.linkedin.com/in/a", "https://evil.com/in/a", "linkedin.com/in/a"]) {
      const result = parseProfileForm(form({ name: "Ada", linkedin_url: bad }));
      expect(result).toMatchObject({ ok: false, errors: { linkedin_url: expect.any(String) } });
    }
  });

  it("rejects an unknown member type", () => {
    const result = parseProfileForm(form({ name: "Ada", member_type: "wizard" }));
    expect(result).toMatchObject({ ok: false, errors: { member_type: expect.any(String) } });
  });
});
