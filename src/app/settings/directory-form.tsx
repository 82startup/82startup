"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { setDirectoryVisibility, type SettingsState } from "./actions";

export function DirectoryForm({ showInDirectory }: { showInDirectory: boolean }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(setDirectoryVisibility, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <input type="checkbox" name="show_in_directory" defaultChecked={showInDirectory} />
          {copy.settings.showInDirectory}
        </span>
        <span className="font-normal text-zinc-600 dark:text-zinc-400">{copy.settings.showInDirectoryHint}</span>
      </label>
      <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
        {copy.settings.save}
      </button>
      {state.saved && <span role="status" className="text-sm">{copy.settings.saved}</span>}
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
