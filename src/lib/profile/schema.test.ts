import { describe, expect, it } from "vitest";
import { MEMBER_TYPES, isProfileComplete, parseProfileForm, submittedValues } from "./schema";

// The four required fields, filled.
const REQ = { name: "Ada", job_title: "CEO", company_name: "Acme", member_type: "startup" };

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
        job_title: "CEO",
        company_name: "Acme",
        company_website: " https://acme.example.com ",
        bio: "Hello",
        linkedin_url: "https://www.linkedin.com/in/ada",
        member_type: "startup",
        show_in_directory: "on",
      }),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Ada Lee",
        job_title: "CEO",
        company_name: "Acme",
        company_website: "https://acme.example.com",
        bio: "Hello",
        linkedin_url: "https://www.linkedin.com/in/ada",
        member_type: "startup",
      },
    });
  });

  it("ignores a submitted directory switch: it now lives in Settings, so saving the profile never changes it", () => {
    const extras: Record<string, string>[] = [{ show_in_directory: "on" }, { show_in_directory: "yes" }, {}];
    for (const extra of extras) {
      const result = parseProfileForm(form({ ...REQ, ...extra }));
      expect(result).toMatchObject({ ok: true });
      expect((result as { value: object }).value).not.toHaveProperty("show_in_directory");
    }
  });

  it("treats an empty LinkedIn URL and company website as null (they stay optional)", () => {
    const result = parseProfileForm(form({ ...REQ, linkedin_url: "", company_website: "" }));
    expect(result).toMatchObject({ ok: true, value: { linkedin_url: null, company_website: null } });
  });

  it("requires a name", () => {
    const result = parseProfileForm(form({ name: "   " }));
    expect(result).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
  });

  it("requires I am, name, job title and company, each with its own error", () => {
    for (const field of ["member_type", "name", "job_title", "company_name"] as const) {
      const result = parseProfileForm(form({ ...REQ, [field]: "" }));
      expect(result).toMatchObject({ ok: false, errors: { [field]: expect.any(String) } });
      expect(Object.keys((result as { errors: object }).errors)).toEqual([field]);
    }
  });

  it("counts a required field with only spaces as empty", () => {
    for (const field of ["name", "job_title", "company_name"] as const) {
      expect(parseProfileForm(form({ ...REQ, [field]: " \n\t " }))).toMatchObject({ ok: false, errors: { [field]: expect.any(String) } });
    }
  });

  it("keeps the website, bio, LinkedIn and directory switch optional", () => {
    expect(parseProfileForm(form(REQ))).toMatchObject({
      ok: true,
      value: { company_website: null, bio: "", linkedin_url: null },
    });
  });

  it("rejects too-long fields", () => {
    const result = parseProfileForm(
      form({
        name: "x".repeat(101),
        job_title: "h".repeat(121),
        company_name: "c".repeat(101),
        company_website: "https://" + "w".repeat(193),
        bio: "b".repeat(1001),
      }),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: expect.any(String),
        job_title: expect.any(String),
        company_name: expect.any(String),
        company_website: expect.any(String),
        bio: expect.any(String),
      },
    });
  });

  it("accepts values exactly at the limits", () => {
    const result = parseProfileForm(
      form({
        ...REQ,
        name: "x".repeat(100),
        job_title: "h".repeat(120),
        company_name: "c".repeat(100),
        company_website: "https://" + "w".repeat(192),
        bio: "b".repeat(1000),
      }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects each field one character over its limit", () => {
    const base = { name: "x".repeat(100), job_title: "h".repeat(120), company_name: "c".repeat(100), bio: "b".repeat(1000) };
    for (const [field, max] of [["name", 100], ["job_title", 120], ["company_name", 100], ["bio", 1000]] as const) {
      const result = parseProfileForm(form({ ...base, [field]: "z".repeat(max + 1) }));
      expect(result).toMatchObject({ ok: false, errors: { [field]: expect.any(String) } });
    }
  });

  it("accepts an http or https company website", () => {
    for (const good of ["http://acme.example.com", "https://acme.example.com/about?x=1"]) {
      const result = parseProfileForm(form({ ...REQ, name: "Ada", company_website: good }));
      expect(result).toMatchObject({ ok: true, value: { company_website: good } });
    }
  });

  it("rejects a company website that is not an http or https address", () => {
    for (const bad of ["javascript:alert(1)", "ftp://acme.example.com", "acme.example.com", "https://", "http://exa mple.com"]) {
      const result = parseProfileForm(form({ ...REQ, name: "Ada", company_website: bad }));
      expect(result).toMatchObject({ ok: false, errors: { company_website: expect.any(String) } });
    }
  });

  it("rejects a LinkedIn URL that is not on linkedin.com over https", () => {
    for (const bad of ["http://www.linkedin.com/in/a", "https://evil.com/in/a", "linkedin.com/in/a"]) {
      const result = parseProfileForm(form({ ...REQ, name: "Ada", linkedin_url: bad }));
      expect(result).toMatchObject({ ok: false, errors: { linkedin_url: expect.any(String) } });
    }
  });

  it("offers exactly the six member types", () => {
    expect([...MEMBER_TYPES]).toEqual(["startup", "investor", "student", "corporate", "institution", "other"]);
  });

  it("accepts each member type", () => {
    for (const type of MEMBER_TYPES) {
      const result = parseProfileForm(form({ ...REQ, name: "Ada", member_type: type }));
      expect(result).toMatchObject({ ok: true, value: { member_type: type } });
    }
  });

  it("rejects an unknown or retired member type", () => {
    for (const bad of ["wizard", "founder", "talent", "attendee"]) {
      const result = parseProfileForm(form({ ...REQ, name: "Ada", member_type: bad }));
      expect(result).toMatchObject({ ok: false, errors: { member_type: expect.any(String) } });
    }
  });
});

describe("submittedValues", () => {
  it("returns the seven raw strings untrimmed, with missing keys as empty strings", () => {
    const values = submittedValues(form({ name: "  Ada ", bio: "x", member_type: "wizard", show_in_directory: "on", extra: "ignored" }));
    expect(values).toEqual({
      name: "  Ada ",
      job_title: "",
      company_name: "",
      company_website: "",
      bio: "x",
      linkedin_url: "",
      member_type: "wizard",
    });
  });
});

describe("isProfileComplete", () => {
  const done = { name: "Ada", job_title: "CEO", company_name: "Acme", member_type: "startup" as const };
  it("is true when the member type is chosen and name, job title and company are filled", () => {
    expect(isProfileComplete(done)).toBe(true);
  });
  it("is false when any of the four is missing or only spaces", () => {
    expect(isProfileComplete({ ...done, member_type: null })).toBe(false);
    for (const field of ["name", "job_title", "company_name"] as const) {
      expect(isProfileComplete({ ...done, [field]: "" })).toBe(false);
      expect(isProfileComplete({ ...done, [field]: "  \n " })).toBe(false);
    }
  });
});
