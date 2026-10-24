"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import type { Preview } from "@/lib/external/form";
import { ZONES } from "@/lib/external/tz";
import { deleteExternalEvent, readEventLink, refreshFromLink, saveExternalEvent, type ReadState, type SaveState } from "./external-actions";

const input = "rounded border p-2 text-sm";
const t = copy.externalAdmin;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {error && <span role="alert" className="font-normal text-red-700">{error}</span>}
    </label>
  );
}

// The details of an external event, filled from the page (or by hand) for the admin to check and change before saving.
export function ExternalEventForm({ initial, id, hidden = false, submitLabel = t.save, onSaved }: { initial: Preview; id?: string; hidden?: boolean; submitLabel?: string; onSaved?: () => void }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(saveExternalEvent, {});
  const err = state.errors ?? {};
  useEffect(() => {
    if (state.saved) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="url" value={initial.url} />
      {id && <input type="hidden" name="id" value={id} />}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t.from} {initial.host} ·{" "}
        <a href={initial.url} target="_blank" rel="noopener noreferrer" className="underline">{t.open}</a>
      </p>
      <Field label={t.fields.title} error={err.title}>
        <input name="title" required maxLength={200} defaultValue={initial.title} className={input} />
      </Field>
      <Field label={t.fields.description} error={err.description}>
        <textarea name="description" rows={5} maxLength={2000} defaultValue={initial.description} className={input} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t.fields.start} error={err.start}>
          <input name="start" type="datetime-local" required defaultValue={initial.start} className={input} />
        </Field>
        <Field label={t.fields.end} error={err.end}>
          <input name="end" type="datetime-local" defaultValue={initial.end} className={input} />
        </Field>
        <Field label={t.fields.timezone} error={err.timezone}>
          <select name="timezone" defaultValue={initial.timezone} className={input}>
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t.fields.type} error={err.location_type}>
        <select name="location_type" defaultValue={initial.locationType} className={input}>
          <option value="offline">{t.fields.offline}</option>
          <option value="online">{t.fields.online}</option>
          <option value="unknown">{t.fields.unknown}</option>
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.fields.venue} error={err.venue_name}>
          <input name="venue_name" maxLength={200} defaultValue={initial.venueName} className={input} />
        </Field>
        <Field label={t.fields.city} error={err.venue_city}>
          <input name="venue_city" maxLength={100} defaultValue={initial.venueCity} className={input} />
        </Field>
      </div>
      <Field label={t.fields.address} error={err.venue_address}>
        <input name="venue_address" maxLength={300} defaultValue={initial.venueAddress} className={input} />
      </Field>
      <Field label={t.fields.cover} error={err.cover_url}>
        <input name="cover_url" maxLength={500} defaultValue={initial.coverUrl} className={input} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hidden" defaultChecked={hidden} />
        {t.fields.hidden}
      </label>
      {err.url && <span role="alert" className="text-sm text-red-700">{err.url}</span>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">{submitLabel}</button>
        {state.saved && <span role="status" className="text-sm">{t.saved}</span>}
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}

const EMPTY = (url: string, host: string): Preview => ({
  url, host, title: "", description: "", timezone: "UTC", start: "", end: "", locationType: "offline", venueName: "", venueCity: "", venueAddress: "", coverUrl: "",
});

// Step 1: paste a link and read it. Step 2: check the details and add the event. If the page cannot be read, the details can be filled in by hand.
export function AddByLink() {
  const [round, setRound] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // After an event is added: reload the page so the list shows it, close this panel, start the next link from scratch and bring the list into view.
  const added = () => {
    const panel = root.current?.closest("details");
    if (panel) panel.open = false;
    router.refresh();
    setRound((n) => n + 1);
    setTimeout(() => document.getElementById("events-list")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  };

  return (
    <div ref={root}>
      <AddByLinkSteps key={round} onAdded={added} />
    </div>
  );
}

// Its state lives here, so a new round (a new key) starts with an empty link box and no old preview.
function AddByLinkSteps({ onAdded }: { onAdded: () => void }) {
  const [state, formAction, pending] = useActionState<ReadState, FormData>(readEventLink, {});
  const [manual, setManual] = useState<Preview | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const preview = cancelled ? null : (manual ?? state.preview ?? null);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <form action={(formData) => { setCancelled(false); setManual(null); formAction(formData); }} className="flex flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.intro}</p>
          <Field label={t.link}>
            <input name="link" type="url" required maxLength={500} className={input} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">{pending ? t.reading : t.read}</button>
            {state.fillByHand && (
              <button type="button" onClick={() => setManual(EMPTY(state.fillByHand!.url, state.fillByHand!.host))} className="text-sm underline">{t.byHand}</button>
            )}
          </div>
          {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        </form>
      )}
      {preview && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">{t.previewTitle}</h3>
          <ExternalEventForm initial={preview} submitLabel={t.add} onSaved={onAdded} />
          <button type="button" onClick={() => { setManual(null); setCancelled(true); }} className="self-start text-sm underline">{t.cancel}</button>
        </div>
      )}
    </div>
  );
}

// The tools on one external event in the list: change its details, read its page again, delete it.
export function ExternalEventTools({ id, initial, hidden }: { id: string; initial: Preview; hidden: boolean }) {
  const [refreshState, refreshAction, refreshing] = useActionState<ReadState, FormData>(refreshFromLink, {});
  const [deleteState, deleteAction, deleting] = useActionState<SaveState, FormData>(deleteExternalEvent, {});
  const current = refreshState.preview ?? initial;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <form action={refreshAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={refreshing} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{t.refresh}</button>
        </form>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm(t.confirmDelete)) event.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={deleting} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{t.delete}</button>
        </form>
      </div>
      {refreshState.error && <span role="alert" className="text-sm text-red-700">{refreshState.error}</span>}
      {deleteState.error && <span role="alert" className="text-sm text-red-700">{deleteState.error}</span>}
      <details open={Boolean(refreshState.preview)}>
        <summary className="cursor-pointer text-sm underline">{t.edit}</summary>
        <div className="mt-3">
          <ExternalEventForm key={refreshState.preview ? "refreshed" : "stored"} initial={current} id={id} hidden={hidden} />
        </div>
      </details>
    </div>
  );
}
