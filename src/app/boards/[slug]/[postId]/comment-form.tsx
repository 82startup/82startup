"use client";

import { useActionState } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { createBoardComment, type CommentState } from "../../comment-actions";

export function CommentForm({ slug, postId }: { slug: string; postId: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(createBoardComment, {});
  return (
    // The key changes after a successful send, which clears the box.
    <form className="board-comment-form" action={action} key={state.sentAt ?? 0}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      <textarea name="body" rows={3} maxLength={1000} placeholder={copy.boards.comments.placeholder} aria-label={copy.boards.comments.placeholder} />
      <button type="submit" className="community-action" disabled={pending}>{pending ? copy.boards.comments.sending : copy.boards.comments.send}</button>
      <Toast trigger={state} message={state.error} tone="error" />
    </form>
  );
}
