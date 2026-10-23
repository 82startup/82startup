import { copy } from "@/lib/copy";

export const MEMBER_TYPES = ["founder", "investor", "talent", "attendee"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export type ProfileInput = {
  name: string;
  headline: string;
  company_name: string;
  bio: string;
  linkedin_url: string | null;
  member_type: MemberType | null;
};

export type ParseResult =
  | { ok: true; value: ProfileInput }
  | { ok: false; errors: Partial<Record<keyof ProfileInput, string>> };

const LINKEDIN_URL = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const SUBMITTED_KEYS = ["name", "headline", "company_name", "bio", "linkedin_url", "member_type"] as const;
export type SubmittedValues = Record<(typeof SUBMITTED_KEYS)[number], string>;

export function submittedValues(formData: FormData): SubmittedValues {
  return Object.fromEntries(
    SUBMITTED_KEYS.map((key) => [key, String(formData.get(key) ?? "")]),
  ) as SubmittedValues;
}

export function parseProfileForm(formData: FormData): ParseResult {
  const errors: Partial<Record<keyof ProfileInput, string>> = {};

  const name = text(formData, "name");
  const headline = text(formData, "headline");
  const company_name = text(formData, "company_name");
  const bio = text(formData, "bio");
  const linkedin = text(formData, "linkedin_url");
  const type = text(formData, "member_type");

  if (name.length === 0 || name.length > 100) errors.name = copy.profile.errors.name;
  if (headline.length > 120) errors.headline = copy.profile.errors.headline;
  if (company_name.length > 100) errors.company_name = copy.profile.errors.company_name;
  if (bio.length > 1000) errors.bio = copy.profile.errors.bio;
  if (linkedin && !LINKEDIN_URL.test(linkedin)) errors.linkedin_url = copy.profile.errors.linkedin_url;
  if (type && !(MEMBER_TYPES as readonly string[]).includes(type)) errors.member_type = copy.profile.errors.member_type;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      headline,
      company_name,
      bio,
      linkedin_url: linkedin || null,
      member_type: (type || null) as MemberType | null,
    },
  };
}
