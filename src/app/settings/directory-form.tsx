"use client";

import { useActionState } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { setDirectoryVisibility, type SettingsState } from "./actions";

export function DirectoryForm({ showInDirectory }: { showInDirectory: boolean }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(setDirectoryVisibility, {});
  return (
    <form action={formAction} className="settings-form">
      <label className="settings-option">
        <span className="settings-option-copy">
          <span className="settings-option-title">{copy.settings.showInDirectory}</span>
          <span className="settings-option-text">{copy.settings.showInDirectoryHint}</span>
        </span>
        <input type="checkbox" role="switch" className="settings-switch" name="show_in_directory" defaultChecked={showInDirectory} />
      </label>
      <div className="settings-footer">
        <Toast trigger={state} message={state.error ?? (state.saved ? copy.settings.saved : null)} tone={state.error ? "error" : "success"} />
        <button type="submit" disabled={pending} className="community-action">
          {copy.settings.save}
        </button>
      </div>
    </form>
  );
}
