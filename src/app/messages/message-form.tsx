"use client";

import { useActionState, useEffect, useRef } from "react";
import { copy } from "@/lib/copy";
import { sendMessage, type MessageState } from "./actions";

// The box under a conversation. After a successful send the text clears and the box keeps focus, so the keyboard
// stays open on phones for the next message.
export function MessageForm({ memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!state.sentAt || !box.current) return;
    box.current.value = "";
    box.current.focus({ preventScroll: true });
  }, [state.sentAt]);
  return (
    <form action={formAction} className="conversation-composer">
      <input type="hidden" name="member" value={memberId} />
      <textarea
        ref={box}
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
      {/* Pressing Send must not take focus from the box, or the phone keyboard closes. */}
      <button type="submit" disabled={pending} className="conversation-send" onPointerDown={(event) => event.preventDefault()}>
        {pending ? copy.messages.sending : copy.messages.send}
      </button>
      {state.error && <span role="alert" className="board-error conversation-error">{state.error}</span>}
    </form>
  );
}
