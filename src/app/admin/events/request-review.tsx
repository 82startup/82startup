"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { copy } from "@/lib/copy";
import { EMPTY, ExternalEventForm } from "./external-forms";
import { readEventLink, type ReadState } from "./external-actions";
import { rejectEventRequest, type RejectState } from "./request-actions";

const t = copy.admin.requests;

// One waiting request. "Review and add" reads the member's link like "Add an event by link" does and shows the same details form;
// adding the event from it approves the request. "Reject" closes it with an optional reason.
export function RequestReview({ id, url, host }: { id: string; url: string; host: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [read, readAction, reading] = useActionState<ReadState, FormData>(readEventLink, {});
  const [rejected, rejectAction, rejecting] = useActionState<RejectState, FormData>(rejectEventRequest, {});
  const preview = read.preview ?? (manual ? EMPTY(url, host) : null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <form action={(formData) => { setOpen(true); setManual(false); readAction(formData); }}>
          <input type="hidden" name="link" value={url} />
          <button type="submit" disabled={reading} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{reading ? copy.externalAdmin.reading : t.review}</button>
        </form>
        <form
          action={rejectAction}
          onSubmit={(event) => {
            if (!window.confirm(t.confirmReject)) event.preventDefault();
          }}
          className="flex flex-wrap items-start gap-2"
        >
          <input type="hidden" name="id" value={id} />
          <input name="reason" maxLength={300} placeholder={t.reason} aria-label={t.reason} className="min-w-48 rounded border p-1 text-xs" />
          <button type="submit" disabled={rejecting} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{t.reject}</button>
        </form>
      </div>
      {rejected.error && <span role="alert" className="text-sm text-red-700">{rejected.error}</span>}
      {open && read.error && <span role="alert" className="text-sm text-red-700">{read.error}</span>}
      {open && read.fillByHand && !manual && (
        <button type="button" onClick={() => setManual(true)} className="self-start text-sm underline">{copy.externalAdmin.byHand}</button>
      )}
      {open && preview && (
        <div className="flex flex-col gap-3 rounded border p-3">
          <h3 className="font-semibold">{copy.externalAdmin.previewTitle}</h3>
          <ExternalEventForm initial={preview} requestId={id} submitLabel={copy.externalAdmin.add} onSaved={() => router.refresh()} />
          <button type="button" onClick={() => { setOpen(false); setManual(false); }} className="self-start text-sm underline">{t.cancel}</button>
        </div>
      )}
    </div>
  );
}
