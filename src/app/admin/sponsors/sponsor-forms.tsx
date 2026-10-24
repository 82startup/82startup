"use client";

import { useActionState, useEffect, useRef } from "react";
import { copy } from "@/lib/copy";
import { TIERS, type Sponsor } from "@/lib/site/types";
import { saveContactLink, saveSponsor, type SponsorState } from "./actions";

const input = "rounded border p-2 text-sm";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {error && <span role="alert" className="font-normal text-red-700">{error}</span>}
    </label>
  );
}

// Add a sponsor (no `sponsor`) or edit one. The picture is optional; a new one replaces the old.
export function SponsorForm({ sponsor }: { sponsor?: Sponsor }) {
  const [state, formAction, pending] = useActionState<SponsorState, FormData>(saveSponsor, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved && !sponsor) form.current?.reset();
  }, [state, sponsor]);
  const err = state.errors ?? {};

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-3">
      {sponsor && <input type="hidden" name="id" value={sponsor.id} />}
      <Field label={copy.sponsorsAdmin.name} error={err.name}>
        <input name="name" required maxLength={100} defaultValue={sponsor?.name} className={input} />
      </Field>
      <Field label={copy.sponsorsAdmin.tier} error={err.tier}>
        <select name="tier" defaultValue={sponsor?.tier ?? "gold"} className={input}>
          {TIERS.map((tier) => (
            <option key={tier} value={tier}>{copy.sponsorsAdmin.tiers[tier]}</option>
          ))}
        </select>
      </Field>
      <Field label={copy.sponsorsAdmin.website} error={err.website_url}>
        <input name="website_url" type="url" maxLength={200} defaultValue={sponsor?.website_url ?? ""} className={input} />
      </Field>
      <Field label={copy.sponsorsAdmin.description} error={err.description}>
        <textarea name="description" rows={4} maxLength={600} defaultValue={sponsor?.description} className={input} />
      </Field>
      <Field label={copy.sponsorsAdmin.logo} error={err.logo}>
        <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
      </Field>
      {sponsor?.logo_path && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remove_logo" />
          {copy.sponsorsAdmin.removeLogo}
        </label>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
          {copy.sponsorsAdmin.save}
        </button>
        {state.saved && <span role="status" className="text-sm">{copy.sponsorsAdmin.saved}</span>}
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}

export function ContactForm({ value }: { value: string }) {
  const [state, formAction, pending] = useActionState<SponsorState, FormData>(saveContactLink, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Field label={copy.sponsorsAdmin.contactLabel}>
        <input name="contact" defaultValue={value} maxLength={200} className={input} />
      </Field>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{copy.sponsorsAdmin.contactHint}</p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">{copy.sponsorsAdmin.save}</button>
        {state.saved && <span role="status" className="text-sm">{copy.sponsorsAdmin.saved}</span>}
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
