"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { RichText } from "@/lib/boards/rich-text";
import { updateBoardComment, type CommentState } from "../../comment-actions";

type Props = { slug: string; postId: string; commentId: string; body: string; canEdit: boolean; meta: ReactNode; deleteButton: ReactNode };

export function CommentBody({ slug, postId, commentId, body, canEdit, meta, deleteButton }: Props) {
  const [editing, setEditing] = useState(false);
  // Controlled, so a failed save does not reset the box to the old body.
  const [draft, setDraft] = useState(body);
  // A successful save closes the form from the action itself, not from an effect.
  const [state, action, pending] = useActionState<CommentState, FormData>(async (prev, formData) => {
    const result = await updateBoardComment(prev, formData);
    if (!result.error) setEditing(false);
    return result;
  }, {});

  // The name row carries Edit and Delete together at the right; Edit hides while the edit form is open.
  return (
    <div className="board-comment-main">
      <div className="board-comment-meta">
        {meta}
        {((canEdit && !editing) || deleteButton) && (
          <span className="board-comment-actions">
            {canEdit && !editing && (
              <button type="button" className="action-quiet" onClick={() => {
                  setDraft(body);
                  setEditing(true);
                }}>
                {copy.boards.comments.edit}
              </button>
            )}
            {deleteButton}
          </span>
        )}
      </div>
      {editing ? (
        // Rendered only while editing; Edit re-initialises the draft from the current body.
        <form className="board-comment-form board-comment-edit" action={action}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="commentId" value={commentId} />
          <textarea name="body" rows={3} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={copy.boards.comments.edit} />
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
        <p><RichText text={body} /></p>
      )}
      <Toast trigger={state} message={state.error} tone="error" />
    </div>
  );
}
