import { copy } from "@/lib/copy";

export const MEMBER_TYPES = ["startup", "investor", "student", "corporate", "institution", "other"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export type ProfileInput = {
  name: string;
  job_title: string;
  company_name: string;
  company_website: string | null;
  bio: string;
  linkedin_url: string | null;
  member_type: MemberType | null;
};

export type ParseResult =
  | { ok: true; value: ProfileInput }
  | { ok: false; errors: Partial<Record<keyof ProfileInput, string>> };

const LINKEDIN_URL = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//;
const WEBSITE_URL = /^https?:\/\/\S+$/;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const SUBMITTED_KEYS = ["name", "job_title", "company_name", "company_website", "bio", "linkedin_url", "member_type"] as const;
export type SubmittedValues = Record<(typeof SUBMITTED_KEYS)[number], string>;

export function submittedValues(formData: FormData): SubmittedValues {
  return Object.fromEntries(
    SUBMITTED_KEYS.map((key) => [key, String(formData.get(key) ?? "")]),
  ) as SubmittedValues;
}

export function parseProfileForm(formData: FormData): ParseResult {
  const errors: Partial<Record<keyof ProfileInput, string>> = {};

  const name = text(formData, "name");
  const job_title = text(formData, "job_title");
  const company_name = text(formData, "company_name");
  const website = text(formData, "company_website");
  const bio = text(formData, "bio");
  const linkedin = text(formData, "linkedin_url");
  const type = text(formData, "member_type");

  if (name.length === 0 || name.length > 100) errors.name = copy.profile.errors.name;
  if (job_title.length > 120) errors.job_title = copy.profile.errors.job_title;
  if (company_name.length > 100) errors.company_name = copy.profile.errors.company_name;
  if (website && (website.length > 200 || !WEBSITE_URL.test(website))) errors.company_website = copy.profile.errors.company_website;
  if (bio.length > 1000) errors.bio = copy.profile.errors.bio;
  if (linkedin && !LINKEDIN_URL.test(linkedin)) errors.linkedin_url = copy.profile.errors.linkedin_url;
  if (type && !(MEMBER_TYPES as readonly string[]).includes(type)) errors.member_type = copy.profile.errors.member_type;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      job_title,
      company_name,
      company_website: website || null,
      bio,
      linkedin_url: linkedin || null,
      member_type: (type || null) as MemberType | null,
    },
  };
}
