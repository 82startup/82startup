"use client";

import { useState, useTransition } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { deleteBoardComment, type DeleteCommentResult } from "../../comment-actions";

export function DeleteCommentButton({ slug, postId, commentId }: { slug: string; postId: string; commentId: string }) {
  const [result, setResult] = useState<DeleteCommentResult>({});
  const [pending, start] = useTransition();
  function onDelete() {
    const data = new FormData();
    data.set("slug", slug);
    data.set("postId", postId);
    data.set("commentId", commentId);
    start(async () => setResult(await deleteBoardComment(data)));
  }
  return (
    <>
      <button type="button" className="action-quiet" disabled={pending} onClick={onDelete}>{copy.boards.comments.delete}</button>
      <Toast trigger={result} message={result.error} tone="error" />
    </>
  );
}
