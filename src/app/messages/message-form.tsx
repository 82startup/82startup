"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { sendMessage, type MessageState } from "./actions";

// The box under a conversation. After a successful send the form is rebuilt, which clears the text.
export function MessageForm({ memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  return (
    <form key={state.sentAt ?? 0} action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="member" value={memberId} />
      <textarea
        name="body"
        required
        maxLength={2000}
        rows={3}
        placeholder={copy.messages.placeholder}
        aria-label={copy.messages.placeholder}
        className="w-full rounded border p-2"
      />
      <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
        {pending ? copy.messages.sending : copy.messages.send}
      </button>
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
