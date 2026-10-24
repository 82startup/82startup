"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { withdrawEventRequest } from "./actions";

export function WithdrawButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(withdrawEventRequest, {});
  return (
    <form action={formAction} className="flex flex-col items-start">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{copy.eventRequests.withdraw}</button>
      {state.error && <span role="alert" className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
