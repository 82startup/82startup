import { describe, expect, it } from "vitest";
import { parseContactLink, parseSpeakerForm, parseSponsorForm } from "./validate";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};
const EVENT = "11111111-2222-3333-4444-555555555555";

describe("parseSponsorForm", () => {
  it("accepts a complete sponsor and trims text, with empty optional fields as null or empty", () => {
    expect(parseSponsorForm(form({ name: "  Acme  ", tier: "gold", website_url: " https://acme.test ", description: " About " }))).toEqual({
      ok: true,
      value: { name: "Acme", tier: "gold", website_url: "https://acme.test", description: "About" },
    });
    expect(parseSponsorForm(form({ name: "Acme", tier: "bronze" }))).toEqual({
      ok: true,
      value: { name: "Acme", tier: "bronze", website_url: null, description: "" },
    });
  });

  it("requires a name and one of the five tiers", () => {
    expect(parseSponsorForm(form({ name: "  ", tier: "gold" }))).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    for (const tier of ["", "titanium", "Gold", "DIAMOND"]) expect(parseSponsorForm(form({ name: "A", tier }))).toMatchObject({ ok: false, errors: { tier: expect.any(String) } });
    for (const tier of ["platinum", "diamond", "gold", "silver", "bronze"]) expect(parseSponsorForm(form({ name: "A", tier }))).toMatchObject({ ok: true });
  });

  it("enforces every limit exactly", () => {
    expect(parseSponsorForm(form({ name: "x".repeat(100), tier: "gold", description: "d".repeat(600) }))).toMatchObject({ ok: true });
    expect(parseSponsorForm(form({ name: "x".repeat(101), tier: "gold" }))).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(parseSponsorForm(form({ name: "A", tier: "gold", description: "d".repeat(601) }))).toMatchObject({ ok: false, errors: { description: expect.any(String) } });
    expect(parseSponsorForm(form({ name: "A", tier: "gold", website_url: "https://" + "w".repeat(193) }))).toMatchObject({ ok: false, errors: { website_url: expect.any(String) } });
  });

  it("accepts only https website addresses", () => {
    for (const bad of ["http://acme.test", "acme.test", "javascript:alert(1)", "https://", "https://a b.test", "ftp://x.test"]) {
      expect(parseSponsorForm(form({ name: "A", tier: "gold", website_url: bad }))).toMatchObject({ ok: false, errors: { website_url: expect.any(String) } });
    }
  });
});

describe("parseSpeakerForm", () => {
  const base = { name: "Ada Lee" };
  it("accepts a speaker with only a name, and a complete one", () => {
    expect(parseSpeakerForm(form(base))).toEqual({
      ok: true,
      value: { name: "Ada Lee", job_title: "", company: "", bio: "", linkedin_url: null, website_url: null, event_id: null },
    });
    expect(
      parseSpeakerForm(form({ ...base, job_title: "CEO", company: "Acme", bio: "Hi", linkedin_url: "https://www.linkedin.com/in/ada", website_url: "https://ada.test", event_id: EVENT })),
    ).toMatchObject({ ok: true, value: { job_title: "CEO", company: "Acme", bio: "Hi", linkedin_url: "https://www.linkedin.com/in/ada", website_url: "https://ada.test", event_id: EVENT } });
  });

  it("requires a name and enforces the limits", () => {
    expect(parseSpeakerForm(form({ name: "" }))).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(parseSpeakerForm(form({ ...base, job_title: "j".repeat(121) }))).toMatchObject({ ok: false, errors: { job_title: expect.any(String) } });
    expect(parseSpeakerForm(form({ ...base, company: "c".repeat(101) }))).toMatchObject({ ok: false, errors: { company: expect.any(String) } });
    expect(parseSpeakerForm(form({ ...base, bio: "b".repeat(1001) }))).toMatchObject({ ok: false, errors: { bio: expect.any(String) } });
    expect(parseSpeakerForm(form({ ...base, bio: "b".repeat(1000), job_title: "j".repeat(120), company: "c".repeat(100) }))).toMatchObject({ ok: true });
  });

  it("accepts only a https linkedin.com address for LinkedIn and an https address for the website", () => {
    for (const bad of ["http://www.linkedin.com/in/a", "https://evil.test/in/a", "linkedin.com/in/a", "https://notlinkedin.com/in/a"]) {
      expect(parseSpeakerForm(form({ ...base, linkedin_url: bad }))).toMatchObject({ ok: false, errors: { linkedin_url: expect.any(String) } });
    }
    expect(parseSpeakerForm(form({ ...base, website_url: "http://x.test" }))).toMatchObject({ ok: false, errors: { website_url: expect.any(String) } });
  });

  it("accepts an event that is a UUID or empty, and nothing else", () => {
    expect(parseSpeakerForm(form({ ...base, event_id: "" }))).toMatchObject({ ok: true, value: { event_id: null } });
    expect(parseSpeakerForm(form({ ...base, event_id: "nope" }))).toMatchObject({ ok: false, errors: { event_id: expect.any(String) } });
  });
});

describe("parseContactLink", () => {
  it("accepts an https address or a mailto: address, trimmed, and an empty value as none", () => {
    expect(parseContactLink(" https://x.test/contact ")).toEqual({ ok: true, value: "https://x.test/contact" });
    expect(parseContactLink("mailto:sponsors@x.test")).toEqual({ ok: true, value: "mailto:sponsors@x.test" });
    expect(parseContactLink("   ")).toEqual({ ok: true, value: null });
  });
  it("refuses everything else, and anything over 200 characters", () => {
    for (const bad of ["javascript:alert(1)", "http://x.test", "mailto:nobody", "sponsors@x.test", "https://a b.test", "data:text/html,x", "https://" + "w".repeat(193)]) {
      expect(parseContactLink(bad)).toMatchObject({ ok: false });
    }
  });
});
