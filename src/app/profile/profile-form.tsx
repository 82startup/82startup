"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { MEMBER_TYPES, type MemberType } from "@/lib/profile/schema";
import { updateProfile, type ProfileFormState } from "./actions";

type Props = {
  profile: {
    name: string;
    job_title: string;
    company_name: string;
    company_website: string | null;
    bio: string;
    linkedin_url: string | null;
    member_type: MemberType | null;
  };
};

export function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const err = state.errors ?? {};
  const v = state.values;

  return (
    <form key={v ? JSON.stringify(v) : "saved"} action={action} className="flex flex-col gap-4">
      {profile.member_type === null && <p className="rounded border p-3">{copy.profile.pickType}</p>}
      {state.saved && <p role="status" className="rounded border p-3">{copy.profile.saved}</p>}
      {err.save && <p role="alert" className="rounded border border-red-400 p-3 text-red-700">{err.save}</p>}

      <Field label={copy.profile.memberType} error={err.member_type}>
        <select name="member_type" defaultValue={v?.member_type ?? profile.member_type ?? ""} className="rounded border p-2">
          <option value="">—</option>
          {MEMBER_TYPES.map((type) => (
            <option key={type} value={type}>{copy.profile.types[type]}</option>
          ))}
        </select>
      </Field>
      <Field label={copy.profile.name} error={err.name}>
        <input name="name" defaultValue={v?.name ?? profile.name} required maxLength={100} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.jobTitle} error={err.job_title}>
        <input name="job_title" defaultValue={v?.job_title ?? profile.job_title} maxLength={120} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.company} error={err.company_name}>
        <input name="company_name" defaultValue={v?.company_name ?? profile.company_name} maxLength={100} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.companyWebsite} error={err.company_website}>
        <input name="company_website" type="url" defaultValue={v?.company_website ?? profile.company_website ?? ""} maxLength={200} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.bio} error={err.bio}>
        <textarea name="bio" defaultValue={v?.bio ?? profile.bio} maxLength={1000} rows={5} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.linkedin} error={err.linkedin_url}>
        <input name="linkedin_url" type="url" defaultValue={v?.linkedin_url ?? profile.linkedin_url ?? ""} className="rounded border p-2" />
      </Field>

      <button type="submit" disabled={pending} className="rounded bg-black p-2 text-white disabled:opacity-50">
        {copy.profile.save}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {error && <span role="alert" className="font-normal text-red-700">{error}</span>}
    </label>
  );
}
