"use client";

import Link from "next/link";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { Toast } from "@/components/toast";
import { KAKAO_ENABLED, MEMBER_TYPES, type MemberType } from "@/lib/profile/schema";
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
    kakao_url: string | null;
    member_type: MemberType | null;
  };
};

export function ProfileForm({ profile, setup = false, next = "/" }: Props) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const err = state.errors ?? {};
  const v = state.values;

  return (
    <form key={v ? JSON.stringify(v) : "saved"} action={action} className="profile-form">
      {setup && (
        <>
          <input type="hidden" name="setup" value="1" />
          <input type="hidden" name="next" value={next} />
          <p className="profile-notice">{copy.profile.setupIntro}</p>
        </>
      )}
      <Toast trigger={state} message={err.save ?? (state.saved ? copy.profile.saved : null)} tone={err.save ? "error" : "success"} />

      <Field label={copy.profile.memberType} required error={err.member_type}>
        <select name="member_type" defaultValue={v?.member_type ?? profile.member_type ?? ""} required>
          <option value="">{copy.profile.choose}</option>
          {MEMBER_TYPES.map((type) => (
            <option key={type} value={type}>{copy.profile.types[type]}</option>
          ))}
        </select>
      </Field>
      <Field label={copy.profile.name} required error={err.name}>
        <input name="name" defaultValue={v?.name ?? profile.name} required maxLength={100} />
      </Field>
      <Field label={copy.profile.company} required hint={copy.profile.companyHint} error={err.company_name}>
        <input name="company_name" defaultValue={v?.company_name ?? profile.company_name} required maxLength={100} />
      </Field>
      <Field label={copy.profile.jobTitle} required error={err.job_title}>
        <input name="job_title" defaultValue={v?.job_title ?? profile.job_title} required maxLength={120} />
      </Field>
      <Field label={copy.profile.companyWebsite} error={err.company_website}>
        <input name="company_website" type="url" defaultValue={v?.company_website ?? profile.company_website ?? ""} maxLength={200} />
      </Field>
      <Field label={copy.profile.linkedin} error={err.linkedin_url}>
        <input name="linkedin_url" type="url" defaultValue={v?.linkedin_url ?? profile.linkedin_url ?? ""} />
      </Field>
      {KAKAO_ENABLED && (
      <Field label={copy.profile.kakao} hint={copy.profile.kakaoHint} error={err.kakao_url}>
        <input name="kakao_url" type="url" defaultValue={v?.kakao_url ?? profile.kakao_url ?? ""} maxLength={200} placeholder="https://open.kakao.com/o/..." />
      </Field>
      )}
      <Field label={copy.profile.bio} error={err.bio} wide>
        <textarea name="bio" defaultValue={v?.bio ?? profile.bio} maxLength={1000} rows={5} />
      </Field>

      <div className="profile-form-footer">
        <p>
          {copy.profile.settingsNote} <Link href="/settings">{copy.profile.settingsLink}</Link>.
        </p>
        <button type="submit" disabled={pending} className="community-action">
          {setup ? copy.profile.saveAndContinue : copy.profile.save}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, required = false, hint, wide = false, children }: { label: string; error?: string; required?: boolean; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? "profile-field profile-field-wide" : "profile-field"}>
      <span className="profile-field-label">
        {label}
        {required && <span aria-hidden className="profile-required"> *</span>}
      </span>
      {children}
      {hint && <span className="profile-field-hint">{hint}</span>}
      {error && <span role="alert" className="profile-field-error">{error}</span>}
    </label>
  );
}
