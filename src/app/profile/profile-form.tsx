"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { MEMBER_TYPES, type MemberType } from "@/lib/profile/schema";
import { updateProfile, type ProfileFormState } from "./actions";

type Props = {
  setup?: boolean; // the first-time screen: shows the intro and goes on to `next` after saving
  next?: string;
  profile: {
    name: string;
    job_title: string;
    company_name: string;
    company_website: string | null;
    bio: string;
    linkedin_url: string | null;
    member_type: MemberType | null;
    show_in_directory: boolean;
  };
};

export function ProfileForm({ profile, setup = false, next = "/" }: Props) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const err = state.errors ?? {};
  const v = state.values;

  return (
    <form key={v ? JSON.stringify(v) : "saved"} action={action} className="flex flex-col gap-4">
      {setup && (
        <>
          <input type="hidden" name="setup" value="1" />
          <input type="hidden" name="next" value={next} />
          <p className="rounded border p-3">{copy.profile.setupIntro}</p>
        </>
      )}
      {state.saved && <p role="status" className="rounded border p-3">{copy.profile.saved}</p>}
      {err.save && <p role="alert" className="rounded border border-red-400 p-3 text-red-700">{err.save}</p>}

      <Field label={copy.profile.memberType} required error={err.member_type}>
        <select name="member_type" defaultValue={v?.member_type ?? profile.member_type ?? ""} required className="rounded border p-2">
          <option value="">{copy.profile.choose}</option>
          {MEMBER_TYPES.map((type) => (
            <option key={type} value={type}>{copy.profile.types[type]}</option>
          ))}
        </select>
      </Field>
      <Field label={copy.profile.name} required error={err.name}>
        <input name="name" defaultValue={v?.name ?? profile.name} required maxLength={100} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.jobTitle} required error={err.job_title}>
        <input name="job_title" defaultValue={v?.job_title ?? profile.job_title} required maxLength={120} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.company} required hint={copy.profile.companyHint} error={err.company_name}>
        <input name="company_name" defaultValue={v?.company_name ?? profile.company_name} required maxLength={100} className="rounded border p-2" />
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

      <label className="flex flex-col gap-1 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            name="show_in_directory"
            defaultChecked={v ? v.show_in_directory === "on" : profile.show_in_directory}
          />
          {copy.profile.showInDirectory}
        </span>
        <span className="font-normal text-zinc-600 dark:text-zinc-400">{copy.profile.showInDirectoryHint}</span>
      </label>

      <button type="submit" disabled={pending} className="rounded bg-black p-2 text-white disabled:opacity-50">
        {setup ? copy.profile.saveAndContinue : copy.profile.save}
      </button>
    </form>
  );
}

function Field({ label, error, required = false, hint, children }: { label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span>
        {label}
        {required && <span aria-hidden className="text-red-700"> *</span>}
      </span>
      {hint && <span className="font-normal text-zinc-600 dark:text-zinc-400">{hint}</span>}
      {children}
      {error && <span role="alert" className="font-normal text-red-700">{error}</span>}
    </label>
  );
}
