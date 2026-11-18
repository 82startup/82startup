"use client";

import { useActionState, useState } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { createBoardComment, type CommentState } from "../../comment-actions";

export function CommentForm({ slug, postId }: { slug: string; postId: string }) {
  // Controlled, so the text survives a failed send (React resets uncontrolled fields after any action).
  const [draft, setDraft] = useState("");
  const [state, action, pending] = useActionState<CommentState, FormData>(async (prev, formData) => {
    const result = await createBoardComment(prev, formData);
    if (!result.error) setDraft("");
    return result;
  }, {});
  return (
    // The key changes after a successful send, which clears the box.
    <form className="board-comment-form" action={action} key={state.sentAt ?? 0}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      <textarea
        name="body"
        rows={3}
        maxLength={1000}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={copy.boards.comments.placeholder}
        aria-label={copy.boards.comments.placeholder}
      />
      <button type="submit" className="community-action" disabled={pending}>{pending ? copy.boards.comments.sending : copy.boards.comments.send}</button>
      <Toast trigger={state} message={state.error} tone="error" />
    </form>
  );
}
