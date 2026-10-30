"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { countText } from "@/lib/posts/text";
import { createPost, type PostState } from "./post-actions";

const TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
const clean = (s: string) => s.replace(/[  ]/g, " ");

type Props = { connectionCount: number; postsLeft: number; nextAt: string | null };

// The box at the top of the Messages page. Hidden with no connections; replaced by a notice when the daily limit is reached.
export function PostBox({ connectionCount, postsLeft, nextAt }: Props) {
  const [state, formAction, pending] = useActionState<PostState, FormData>(createPost, {});
  if (connectionCount <= 0) return null;

  if (postsLeft <= 0) {
    return (
      <section className="board-composer">
        <h2>{copy.posts.title}</h2>
        <p className="board-composer-hint">{copy.posts.limitReached}{nextAt ? ` ${clean(TIME.format(new Date(nextAt)))}.` : "."}</p>
      </section>
    );
  }

  return (
    <section className="board-composer">
      <h2>{copy.posts.title}</h2>
      <form key={state.sentAt ?? 0} action={formAction} className="board-composer-form">
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={3}
          placeholder={copy.posts.placeholder}
          aria-label={copy.posts.placeholder}
        />
        <div className="board-composer-footer">
          <p className="board-composer-hint">
            {state.error ? <span role="alert" className="board-error">{state.error}</span>
              : state.sentTo !== undefined ? <span role="status">{countText(copy.posts.sent, copy.posts.sentOne, state.sentTo)}</span>
              : countText(copy.posts.willSend, copy.posts.willSendOne, connectionCount)}
          </p>
          <button type="submit" disabled={pending} className="community-action">
            {pending ? copy.posts.posting : copy.posts.post}
          </button>
        </div>
      </form>
    </section>
  );
}
