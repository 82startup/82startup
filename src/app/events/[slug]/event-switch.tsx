"use client";

import { useActionState } from "react";
import type { AttendState } from "./actions";

type Props = {
  action: (prev: AttendState, formData: FormData) => Promise<AttendState>;
  eventId: string;
  slug: string;
  active: boolean;
  label: string; // shown while the switch is off
  activeLabel: string; // shown while it is on
  toggle?: boolean; // a on/off switch (aria-pressed) rather than an action button
};

// One button: pressing it saves the opposite of the current value right away.
export function EventSwitch({ action, eventId, slug, active, label, activeLabel, toggle = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="value" value={String(!active)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={toggle ? active : undefined}
        className={`rounded border px-3 py-1 text-sm disabled:opacity-50 ${toggle && active ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
      >
        {active ? activeLabel : label}
      </button>
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
