"use client";

import { useActionState, useId, useRef } from "react";
import { copy } from "@/lib/copy";
import { sendConnectionRequest, type ConnectionState } from "./actions";

// The Connect button. It opens a popup where a short note can be added before the request is sent (like LinkedIn).
export function ConnectDialog({ memberId, name }: { memberId: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, formAction, pending] = useActionState<ConnectionState, FormData>(sendConnectionRequest, {});

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="community-action">
        {copy.connections.connect}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        // A click on the dark area around the box (the backdrop) closes it; Escape closes it natively.
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="connect-dialog"
      >
        <form action={formAction} className="flex flex-col gap-3">
          <h2 id={titleId} className="text-lg font-semibold">{copy.connections.inviteTitle.replace("{name}", name)}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.connections.inviteHint}</p>
          <input type="hidden" name="member" value={memberId} />
          <textarea
            name="note"
            maxLength={200}
            rows={4}
            autoFocus
            placeholder={copy.connections.notePlaceholder}
            aria-label={copy.connections.notePlaceholder}
            className="w-full rounded border p-2 text-sm"
          />
          {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="community-action community-action-secondary">
              {copy.connections.cancelDialog}
            </button>
            <button type="submit" disabled={pending} className="community-action">
              {copy.connections.send}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
