"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { withdrawEventRequest } from "./actions";

export function WithdrawButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(withdrawEventRequest, {});
  return (
    <form action={formAction} className="action-form">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="action-quiet">{copy.eventRequests.withdraw}</button>
      {state.error && <span role="alert">{state.error}</span>}
    </form>
  );
}
