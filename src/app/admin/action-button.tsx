"use client";

import { useActionState } from "react";

type State = { error?: string };

// One small admin button (hide/show, move, delete) that runs one action. A confirmation can be asked first.
export function ActionButton({ action, fields, label, confirm }: {
  action: (prev: State, formData: FormData) => Promise<State>;
  fields: Record<string, string>;
  label: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="flex flex-col items-start"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{label}</button>
      {state.error && <span role="alert" className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
