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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{copy.speakersAdmin.event}</legend>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.speakersAdmin.noEvents}</p>
        ) : (
          <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded border p-2">
            {events.map((event) => (
              <li key={event.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="event_ids" value={event.id} defaultChecked={speaker?.event_ids.includes(event.id) ?? false} />
                  <span className="min-w-0 break-words">{event.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {err.event_ids && <span role="alert" className="text-sm text-red-700">{err.event_ids}</span>}
      </fieldset>
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
