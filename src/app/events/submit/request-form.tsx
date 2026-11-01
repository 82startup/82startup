"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { EMPTY, ExternalEventForm } from "@/app/admin/events/external-forms";
import type { ReadState } from "@/app/admin/events/external-actions";
import { copy } from "@/lib/copy";
import { readEventRequestLink, submitEventRequest } from "./actions";

const t = copy.eventRequests;

// Step 1: paste a link and read it. Step 2: check the details (fill them in by hand if the page cannot be read), add a note, and send.
export function RequestForm() {
  const [round, setRound] = useState(0);
  const router = useRouter();
  return (
    <RequestSteps
      key={round}
      onSent={() => {
        router.refresh();
        setRound((n) => n + 1);
      }}
    />
  );
}

function RequestSteps({ onSent }: { onSent: () => void }) {
  const [state, formAction, pending] = useActionState<ReadState, FormData>(readEventRequestLink, {});
  const [manual, setManual] = useState<ReturnType<typeof EMPTY> | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const preview = cancelled ? null : (manual ?? state.preview ?? null);

  return (
    <div className="event-request-form">
      {!preview && (
        <form action={(formData) => { setCancelled(false); setManual(null); formAction(formData); }} className="event-request-link">
          <label htmlFor="event-request-link" className="profile-field-label">{t.link}</label>
          <div className="event-request-link-row">
            <input id="event-request-link" name="link" type="url" required maxLength={500} placeholder="https://luma.com/…" />
            <button type="submit" disabled={pending} className="community-action">{pending ? copy.externalAdmin.reading : copy.externalAdmin.read}</button>
          </div>
          {state.fillByHand && (
            <button type="button" onClick={() => setManual(EMPTY(state.fillByHand!.url, state.fillByHand!.host))} className="action-quiet event-request-byhand">{copy.externalAdmin.byHand}</button>
          )}
          {state.error && <span role="alert" className="profile-field-error">{state.error}</span>}
        </form>
      )}
      {preview && (
        <div className="event-request-preview">
          <h2>{copy.externalAdmin.previewTitle}</h2>
          <ExternalEventForm
            initial={preview}
            action={submitEventRequest}
            showHidden={false}
            submitLabel={t.send}
            onSaved={onSent}
            extra={
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t.note}
                <textarea name="note" rows={3} maxLength={300} className="rounded border p-2 text-sm font-normal" />
              </label>
            }
          />
          <button type="button" onClick={() => { setManual(null); setCancelled(true); }} className="action-quiet event-request-cancel">{copy.externalAdmin.cancel}</button>
        </div>
      )}
    </div>
  );
}
