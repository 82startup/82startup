"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { syncNow, type AdminActionState } from "./actions";

export function SyncButton() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(syncNow, {});
  const { sync } = state;
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <button type="submit" disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {pending ? copy.admin.syncing : copy.admin.syncNow}
      </button>
      {sync && (
        <p role="status" className="text-sm">
          {copy.admin.synced} {sync.created} {copy.admin.counts.created}, {sync.updated} {copy.admin.counts.updated},{" "}
          {sync.removed} {copy.admin.counts.removed}, {sync.errors} {copy.admin.counts.errors}
        </p>
      )}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
