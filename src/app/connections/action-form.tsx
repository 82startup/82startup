"use client";

import { useActionState } from "react";
import type { ConnectionState } from "./actions";

type Props = {
  action: (prev: ConnectionState, formData: FormData) => Promise<ConnectionState>;
  fields: Record<string, string>; // sent as hidden inputs
  label: string;
  quiet?: boolean; // a plain link-style button instead of a bordered one
};

// One button that runs one connection action right away and shows the database's refusal, if any.
export function ActionForm({ action, fields, label, quiet = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        disabled={pending}
        className={quiet ? "text-sm underline disabled:opacity-50" : "rounded border px-3 py-1 text-sm disabled:opacity-50"}
      >
        {label}
      </button>
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
