"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { saveNotificationPreferences, type NotificationState } from "./notification-actions";

type Props = { requests: boolean; accepted: boolean; messages: boolean };

const BOXES = [
  { name: "connection_requests", key: "requests" },
  { name: "connection_accepted", key: "accepted" },
  { name: "messages", key: "messages" },
] as const;

// The email choices: all ticked at first; unticking a box stops that email.
export function NotificationsForm(props: Props) {
  const [state, formAction, pending] = useActionState<NotificationState, FormData>(saveNotificationPreferences, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{copy.settings.emailMeWhen}</legend>
        {BOXES.map(({ name, key }) => (
          <label key={name} className="flex flex-col gap-0.5 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <input type="checkbox" name={name} defaultChecked={props[key]} />
              {copy.settings.emails[key].title}
            </span>
            <span className="font-normal text-zinc-600 dark:text-zinc-400">{copy.settings.emails[key].text}</span>
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
        {copy.settings.save}
      </button>
      {state.saved && <span role="status" className="text-sm">{copy.settings.saved}</span>}
      {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
