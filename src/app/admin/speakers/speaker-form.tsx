"use client";

import { useActionState, useEffect, useRef } from "react";
import { copy } from "@/lib/copy";
import { PictureInput } from "../picture-input";
import type { Speaker } from "@/lib/site/types";
import { saveSpeaker, type SpeakerState } from "./actions";

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

export function SpeakerForm({ speaker, events }: { speaker?: Speaker; events: { id: string; title: string }[] }) {
  const [state, formAction, pending] = useActionState<SpeakerState, FormData>(saveSpeaker, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved && !speaker) form.current?.reset();
  }, [state, speaker]);
  const err = state.errors ?? {};

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-3">
      {speaker && <input type="hidden" name="id" value={speaker.id} />}
      <Field label={copy.speakersAdmin.name} error={err.name}>
        <input name="name" required maxLength={100} defaultValue={speaker?.name} className={input} />
      </Field>
      <Field label={copy.speakersAdmin.jobTitle} error={err.job_title}>
        <input name="job_title" maxLength={120} defaultValue={speaker?.job_title} className={input} />
      </Field>
      <Field label={copy.speakersAdmin.company} error={err.company}>
        <input name="company" maxLength={100} defaultValue={speaker?.company} className={input} />
      </Field>
      <Field label={copy.speakersAdmin.bio} error={err.bio}>
        <textarea name="bio" rows={4} maxLength={1000} defaultValue={speaker?.bio} className={input} />
      </Field>
      <Field label={copy.speakersAdmin.linkedin} error={err.linkedin_url}>
        <input name="linkedin_url" type="url" maxLength={200} defaultValue={speaker?.linkedin_url ?? ""} className={input} />
      </Field>
      <Field label={copy.speakersAdmin.website} error={err.website_url}>
        <input name="website_url" type="url" maxLength={200} defaultValue={speaker?.website_url ?? ""} className={input} />
      </Field>
      <Field label={copy.speakersAdmin.event} error={err.event_id}>
        <select name="event_id" defaultValue={speaker?.event_id ?? ""} className={input}>
          <option value="">{copy.speakersAdmin.noEvent}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
      </Field>
      <PictureInput name="photo" kind="speakers" label={copy.speakersAdmin.photo} serverError={err.photo} />
      {speaker?.photo_path && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remove_photo" />
          {copy.speakersAdmin.removePhoto}
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
