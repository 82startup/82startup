"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { sendMessage, type MessageState } from "./actions";

// The box under a conversation. After a successful send the form is rebuilt, which clears the text.
export function MessageForm({ memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  return (
    <form key={state.sentAt ?? 0} action={formAction} className="conversation-composer">
      <input type="hidden" name="member" value={memberId} />
      <textarea
        name="body"
        required
        maxLength={2000}
        rows={1}
        placeholder={copy.messages.placeholder}
        aria-label={copy.messages.placeholder}
        // Enter sends and Shift+Enter adds a line on a hardware keyboard. Never while an IME (Korean, Japanese) is composing
        // (Safari reports the confirming Enter as keyCode 229), while a send is pending or on key repeat (no duplicates),
        // and not on touch screens, where Enter stays a line break and the Send button sends.
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (pending || event.repeat || window.matchMedia("(pointer: coarse)").matches) {
            if (pending || event.repeat) event.preventDefault();
            return;
          }
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
      />
      <button type="submit" disabled={pending} className="conversation-send">
        {pending ? copy.messages.sending : copy.messages.send}
      </button>
      {state.error && <span role="alert" className="board-error conversation-error">{state.error}</span>}
    </form>
  );
}
