"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { submitEventRequest, type RequestState } from "./actions";

export function RequestForm() {
  const [state, formAction, pending] = useActionState<RequestState, FormData>(submitEventRequest, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <label className="flex w-full flex-col gap-1 text-sm font-medium">
        {copy.eventRequests.link}
        <input name="link" type="url" required maxLength={1000} className="rounded border p-2 font-normal" />
      </label>
      <label className="flex w-full flex-col gap-1 text-sm font-medium">
        {copy.eventRequests.note}
        <textarea name="note" rows={3} maxLength={300} className="rounded border p-2 font-normal" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {pending ? copy.eventRequests.sending : copy.eventRequests.send}
      </button>
      {state.sent && <span role="status" className="text-sm">{copy.eventRequests.sent}</span>}
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
