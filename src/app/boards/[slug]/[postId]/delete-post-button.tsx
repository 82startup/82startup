"use client";

import { useState, useTransition } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { deleteBoardPost, type DeletePostResult } from "../../actions";

export function DeletePostButton({ slug, postId }: { slug: string; postId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<DeletePostResult>({});
  const [pending, start] = useTransition();

  function onDelete() {
    const data = new FormData();
    data.set("slug", slug);
    data.set("postId", postId);
    start(async () => setResult((await deleteBoardPost(data)) ?? {}));
  }

  if (!confirming) {
    return <button type="button" className="action-quiet" onClick={() => setConfirming(true)}>{copy.boards.delete}</button>;
  }
  return (
    <span className="board-delete-confirm">
      <span>{copy.boards.deleteConfirm}</span>
      <button type="button" className="community-action" disabled={pending} onClick={onDelete}>{copy.boards.deleteYes}</button>
      <button type="button" className="action-quiet" disabled={pending} onClick={() => setConfirming(false)}>{copy.boards.cancel}</button>
      <Toast trigger={result} message={result.error} tone="error" />
    </span>
  );
}
