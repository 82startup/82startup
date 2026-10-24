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
      <section className="flex flex-col gap-2 rounded border p-3">
        <h2 className="text-lg font-semibold">{copy.posts.title}</h2>
        <p className="text-sm">{copy.posts.limitReached}{nextAt ? ` ${clean(TIME.format(new Date(nextAt)))}.` : "."}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded border p-3">
      <h2 className="text-lg font-semibold">{copy.posts.title}</h2>
      <form key={state.sentAt ?? 0} action={formAction} className="flex flex-col items-start gap-2">
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={3}
          placeholder={copy.posts.placeholder}
          aria-label={copy.posts.placeholder}
          className="w-full rounded border p-2"
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{countText(copy.posts.willSend, copy.posts.willSendOne, connectionCount)}</p>
        <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
          {pending ? copy.posts.posting : copy.posts.post}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state.sentTo !== undefined && !state.error && (
          <span role="status" className="text-sm">{countText(copy.posts.sent, copy.posts.sentOne, state.sentTo)}</span>
        )}
      </form>
    </section>
  );
}
