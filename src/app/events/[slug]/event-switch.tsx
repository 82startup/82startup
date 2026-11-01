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
    <form action={formAction} className="action-form">
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="value" value={String(!active)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={toggle ? active : undefined}
        className={toggle || active ? "community-action community-action-secondary" : "community-action"}
      >
        {active ? activeLabel : label}
      </button>
      {state.error && <span role="alert">{state.error}</span>}
    </form>
  );
}
