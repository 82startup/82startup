"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import type { AdminActionState } from "./actions";

type Props = {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  id: string;
  active: boolean;
  label: string;
};

// One switch: pressing it saves the opposite value right away.
export function AdminSwitch({ action, id, active, label }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="value" value={String(!active)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={active}
        className={`rounded border px-3 py-1 text-sm disabled:opacity-50 ${active ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
      >
        {label}: {active ? copy.admin.on : copy.admin.off}
      </button>
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
