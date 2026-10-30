"use client";

import { useActionState } from "react";
import type { ConnectionState } from "./actions";

type Props = {
  action: (prev: ConnectionState, formData: FormData) => Promise<ConnectionState>;
  fields: Record<string, string>; // sent as hidden inputs
  label: string;
  quiet?: boolean; // a plain link-style button instead of a bordered one
  secondary?: boolean; // an outlined button beside a primary one
};

// One button that runs one connection action right away and shows the database's refusal, if any.
export function ActionForm({ action, fields, label, quiet = false, secondary = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="action-form">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        disabled={pending}
        className={quiet ? "action-quiet" : secondary ? "community-action community-action-secondary" : "community-action"}
      >
        {label}
      </button>
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
