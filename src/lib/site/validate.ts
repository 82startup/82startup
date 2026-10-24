import { TIERS, type Tier } from "./types";

const HTTPS_URL = /^https:\/\/\S+$/;
const LINKEDIN_URL = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/\S*$/;
const MAILTO = /^mailto:\S+@\S+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const long = (value: string, max: number) => [...value].length > max;

export type SponsorInput = { name: string; tier: Tier; website_url: string | null; description: string };
export type SponsorErrors = Partial<Record<keyof SponsorInput, string>>;

export function parseSponsorForm(formData: FormData): { ok: true; value: SponsorInput } | { ok: false; errors: SponsorErrors } {
  const errors: SponsorErrors = {};
  const name = text(formData, "name");
  const tier = text(formData, "tier");
  const website = text(formData, "website_url");
  const description = text(formData, "description");

  if (name === "" || long(name, 100)) errors.name = "Enter a name (up to 100 characters).";
  if (!(TIERS as readonly string[]).includes(tier)) errors.tier = "Choose a tier.";
  if (website && (long(website, 200) || !HTTPS_URL.test(website))) errors.website_url = "Use an https:// address (up to 200 characters).";
  if (long(description, 600)) errors.description = "The description can be up to 600 characters.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, tier: tier as Tier, website_url: website || null, description } };
}

export type SpeakerInput = {
  name: string;
  job_title: string;
  company: string;
  bio: string;
  linkedin_url: string | null;
  website_url: string | null;
  event_id: string | null;
};
export type SpeakerErrors = Partial<Record<keyof SpeakerInput, string>>;

export function parseSpeakerForm(formData: FormData): { ok: true; value: SpeakerInput } | { ok: false; errors: SpeakerErrors } {
  const errors: SpeakerErrors = {};
  const name = text(formData, "name");
  const job_title = text(formData, "job_title");
  const company = text(formData, "company");
  const bio = text(formData, "bio");
  const linkedin = text(formData, "linkedin_url");
  const website = text(formData, "website_url");
  const event = text(formData, "event_id");

  if (name === "" || long(name, 100)) errors.name = "Enter a name (up to 100 characters).";
  if (long(job_title, 120)) errors.job_title = "The job title can be up to 120 characters.";
  if (long(company, 100)) errors.company = "The company can be up to 100 characters.";
  if (long(bio, 1000)) errors.bio = "The bio can be up to 1,000 characters.";
  if (linkedin && (long(linkedin, 200) || !LINKEDIN_URL.test(linkedin))) errors.linkedin_url = "Use a https://www.linkedin.com/... address.";
  if (website && (long(website, 200) || !HTTPS_URL.test(website))) errors.website_url = "Use an https:// address (up to 200 characters).";
  if (event && !UUID.test(event)) errors.event_id = "Choose an event from the list.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, job_title, company, bio, linkedin_url: linkedin || null, website_url: website || null, event_id: event || null } };
}

// The sponsor contact link: an https address or a mailto: address; empty removes it.
export function parseContactLink(raw: string): { ok: true; value: string | null } | { ok: false } {
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };
  if (long(value, 200) || !(HTTPS_URL.test(value) || MAILTO.test(value))) return { ok: false };
  return { ok: true, value };
}
