"use client";

import { useActionState, useState } from "react";
import { copy } from "@/lib/copy";
import { deleteAccount, type DeleteAccountState } from "./delete-account-actions";

export function DeleteAccount() {
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});
  const [confirm, setConfirm] = useState("");
  const ready = confirm.trim() === copy.deleteAccount.confirmWord;
  return (
    <section className="settings-card delete-account">
      <h2>{copy.deleteAccount.title}</h2>
      <p className="settings-intro">{copy.deleteAccount.text}</p>
      <form action={action} className="delete-account-form">
        <label>
          <span>{copy.deleteAccount.confirmLabel}</span>
          <input name="confirm" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </label>
        <button type="submit" className="community-action delete-account-button" disabled={!ready || pending}>
          {pending ? copy.deleteAccount.pending : copy.deleteAccount.button}
        </button>
      </form>
      {state.error && <p className="profile-field-error" role="alert">{state.error}</p>}
    </section>
  );
}
