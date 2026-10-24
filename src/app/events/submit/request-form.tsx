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
    <div className="flex flex-col gap-4">
      {!preview && (
        <form action={(formData) => { setCancelled(false); setManual(null); formAction(formData); }} className="flex flex-col items-start gap-2">
          <label className="flex w-full flex-col gap-1 text-sm font-medium">
            {t.link}
            <input name="link" type="url" required maxLength={500} className="rounded border p-2 text-sm font-normal" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">{pending ? copy.externalAdmin.reading : copy.externalAdmin.read}</button>
            {state.fillByHand && (
              <button type="button" onClick={() => setManual(EMPTY(state.fillByHand!.url, state.fillByHand!.host))} className="text-sm underline">{copy.externalAdmin.byHand}</button>
            )}
          </div>
          {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        </form>
      )}
      {preview && (
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold">{copy.externalAdmin.previewTitle}</h2>
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
          <button type="button" onClick={() => { setManual(null); setCancelled(true); }} className="self-start text-sm underline">{copy.externalAdmin.cancel}</button>
        </div>
      )}
    </div>
  );
}
