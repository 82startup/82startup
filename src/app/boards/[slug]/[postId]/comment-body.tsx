"use client";

import { useActionState, useState } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { updateBoardComment, type CommentState } from "../../comment-actions";

type Props = { slug: string; postId: string; commentId: string; body: string; canEdit: boolean };

export function CommentBody({ slug, postId, commentId, body, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  // A successful save closes the form from the action itself, not from an effect.
  const [state, action, pending] = useActionState<CommentState, FormData>(async (prev, formData) => {
    const result = await updateBoardComment(prev, formData);
    if (!result.error) setEditing(false);
    return result;
  }, {});

  return (
    <>
      {editing ? (
        // Rendered only while editing, so the box always starts from the current body.
        <form className="board-comment-form board-comment-edit" action={action}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="commentId" value={commentId} />
          <textarea name="body" rows={3} maxLength={1000} defaultValue={body} aria-label={copy.boards.comments.edit} />
          <div className="board-comment-edit-actions">
            <button type="button" className="action-quiet" onClick={() => setEditing(false)} disabled={pending}>
              {copy.boards.comments.cancel}
            </button>
            <button type="submit" className="community-action" disabled={pending}>
              {pending ? copy.boards.comments.saving : copy.boards.comments.save}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>{body}</p>
          {canEdit && (
            <button type="button" className="action-quiet board-comment-edit-button" onClick={() => setEditing(true)}>
              {copy.boards.comments.edit}
            </button>
          )}
        </>
      )}
      <Toast trigger={state} message={state.error} tone="error" />
    </>
  );
}
