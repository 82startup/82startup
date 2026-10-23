"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import type { ConnectionState } from "./actions";

type Props = {
  action: (prev: ConnectionState, formData: FormData) => Promise<ConnectionState>;
  fields: Record<string, string>; // sent as hidden inputs
  label: string;
  withNote?: boolean; // a short note box, for a new request
  quiet?: boolean; // a plain link-style button instead of a bordered one
};

// One button that runs one connection action right away and shows the database's refusal, if any.
export function ActionForm({ action, fields, label, withNote = false, quiet = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {withNote && (
        <textarea
          name="note"
          maxLength={200}
          rows={2}
          placeholder={copy.connections.notePlaceholder}
          aria-label={copy.connections.notePlaceholder}
          className="w-full max-w-md rounded border p-2 text-sm"
        />
      )}
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
