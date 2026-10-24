"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { copy } from "@/lib/copy";
import type { Preview } from "@/lib/external/form";
import { ExternalEventForm } from "./external-forms";
import { rejectEventRequest, type RejectState } from "./request-actions";

const t = copy.admin.requests;

// One waiting request. The member already checked the details, so "Review and add" shows them in the same form as "Add an event by
// link" (the admin can still change them); adding the event from it approves the request. "Reject" closes it with an optional reason.
export function RequestReview({ id, details }: { id: string; details: Preview }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rejected, rejectAction, rejecting] = useActionState<RejectState, FormData>(rejectEventRequest, {});

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="rounded border px-2 py-1 text-xs">{t.review}</button>
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
      {open && (
        <div className="flex flex-col gap-3 rounded border p-3">
          <h3 className="font-semibold">{copy.externalAdmin.previewTitle}</h3>
          <ExternalEventForm initial={details} requestId={id} submitLabel={copy.externalAdmin.add} onSaved={() => router.refresh()} />
          <button type="button" onClick={() => setOpen(false)} className="self-start text-sm underline">{t.cancel}</button>
        </div>
      )}
    </div>
  );
}
