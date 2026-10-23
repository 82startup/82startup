import { describe, expect, it } from "vitest";
import { parseProfileForm, submittedValues } from "./schema";

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

  it("accepts values exactly at the limits", () => {
    const result = parseProfileForm(
      form({ name: "x".repeat(100), headline: "h".repeat(120), company_name: "c".repeat(100), bio: "b".repeat(1000) }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects each field one character over its limit", () => {
    const base = { name: "x".repeat(100), headline: "h".repeat(120), company_name: "c".repeat(100), bio: "b".repeat(1000) };
    for (const [field, max] of [["name", 100], ["headline", 120], ["company_name", 100], ["bio", 1000]] as const) {
      const result = parseProfileForm(form({ ...base, [field]: "z".repeat(max + 1) }));
      expect(result).toMatchObject({ ok: false, errors: { [field]: expect.any(String) } });
    }
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

describe("submittedValues", () => {
  it("returns the six raw strings untrimmed, with missing keys as empty strings", () => {
    const values = submittedValues(form({ name: "  Ada ", bio: "x", member_type: "wizard", extra: "ignored" }));
    expect(values).toEqual({
      name: "  Ada ",
      headline: "",
      company_name: "",
      bio: "x",
      linkedin_url: "",
      member_type: "wizard",
    });
  });
});
