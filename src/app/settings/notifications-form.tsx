"use client";

import { useActionState } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { saveNotificationPreferences, type NotificationState } from "./notification-actions";

type Props = { connect: boolean; messages: boolean };

const BOXES = [
  { name: "connect", key: "connect" },
  { name: "messages", key: "messages" },
] as const;

// The email choices: all ticked at first; unticking a box stops that email.
export function NotificationsForm(props: Props) {
  const [state, formAction, pending] = useActionState<NotificationState, FormData>(saveNotificationPreferences, {});
  return (
    <form action={formAction} className="settings-form">
      <fieldset className="settings-fieldset">
        <legend>{copy.settings.emailMeWhen}</legend>
        {BOXES.map(({ name, key }) => (
          <label key={name} className="settings-option">
            <span className="settings-option-copy">
              <span className="settings-option-title">{copy.settings.emails[key].title}</span>
              <span className="settings-option-text">{copy.settings.emails[key].text}</span>
            </span>
            <input type="checkbox" role="switch" className="settings-switch" name={name} defaultChecked={props[key]} />
          </label>
        ))}
      </fieldset>
      <div className="settings-footer">
        <Toast trigger={state} message={state.error ?? (state.saved ? copy.settings.saved : null)} tone={state.error ? "error" : "success"} />
        <button type="submit" disabled={pending} className="community-action">
          {copy.settings.save}
        </button>
      </div>
    </form>
  );
}
