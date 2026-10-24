import { describe, expect, it } from "vitest";
import { parseContactLink, parseSpeakerForm, parseSponsorForm } from "./validate";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

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
  const E1 = "11111111-2222-3333-4444-555555555555";
  const E2 = "66666666-2222-3333-4444-555555555555";
  const multi = (values: Record<string, string>, events: string[] = []) => {
    const data = form(values);
    for (const id of events) data.append("event_ids", id);
    return data;
  };

  it("accepts a speaker with only a name, and one with a title, company and several events", () => {
    expect(parseSpeakerForm(multi(base))).toEqual({ ok: true, value: { name: "Ada Lee", job_title: "", company: "", event_ids: [] } });
    expect(parseSpeakerForm(multi({ ...base, job_title: " CEO ", company: " Acme " }, [E1, E2]))).toEqual({
      ok: true,
      value: { name: "Ada Lee", job_title: "CEO", company: "Acme", event_ids: [E1, E2] },
    });
  });

  it("counts a repeated event once", () => {
    expect(parseSpeakerForm(multi(base, [E1, E1, E2, E1]))).toMatchObject({ ok: true, value: { event_ids: [E1, E2] } });
  });

  it("requires a name and enforces the limits exactly", () => {
    expect(parseSpeakerForm(multi({ name: "" }))).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(parseSpeakerForm(multi({ name: "n".repeat(101) }))).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(parseSpeakerForm(multi({ ...base, job_title: "j".repeat(121) }))).toMatchObject({ ok: false, errors: { job_title: expect.any(String) } });
    expect(parseSpeakerForm(multi({ ...base, company: "c".repeat(101) }))).toMatchObject({ ok: false, errors: { company: expect.any(String) } });
    expect(parseSpeakerForm(multi({ name: "n".repeat(100), job_title: "j".repeat(120), company: "c".repeat(100) }))).toMatchObject({ ok: true });
  });

  it("accepts only event ids that are UUIDs, and at most 50", () => {
    expect(parseSpeakerForm(multi(base, [E1, "nope"]))).toMatchObject({ ok: false, errors: { event_ids: expect.any(String) } });
    const many = Array.from({ length: 51 }, (_, n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`);
    expect(parseSpeakerForm(multi(base, many))).toMatchObject({ ok: false, errors: { event_ids: expect.any(String) } });
    expect(parseSpeakerForm(multi(base, many.slice(0, 50)))).toMatchObject({ ok: true });
  });

  it("ignores the fields speakers no longer have (bio, LinkedIn, website)", () => {
    const result = parseSpeakerForm(multi({ ...base, bio: "Long bio", linkedin_url: "https://www.linkedin.com/in/ada", website_url: "https://ada.test" }));
    expect(result).toMatchObject({ ok: true });
    for (const key of ["bio", "linkedin_url", "website_url"]) expect((result as { value: object }).value).not.toHaveProperty(key);
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
