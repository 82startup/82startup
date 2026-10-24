"use client";

import Link from "next/link";
import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { confirmUnsubscribe, type UnsubscribeState } from "./actions";

type Props = { code: string; kind: string };

const kinds = copy.unsubscribe.kinds as Record<string, string>;

// Opening the link only shows this form; nothing changes until the button is pressed.
export function UnsubscribeForm({ code, kind }: Props) {
  const [state, formAction, pending] = useActionState<UnsubscribeState, FormData>(confirmUnsubscribe, {});

  if (state.invalid) return <p role="alert">{copy.unsubscribe.invalid}</p>;
  if (state.done) {
    return (
      <div className="flex flex-col gap-2">
        <p role="status">{state.done === "all" ? copy.unsubscribe.doneAll : copy.unsubscribe.done.replace("{kind}", kinds[state.done] ?? "")}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {copy.unsubscribe.again} <Link href="/settings" className="underline">{copy.unsubscribe.settings}</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p>{kind === "all" ? copy.unsubscribe.confirmAll : copy.unsubscribe.confirmKind.replace("{kind}", kinds[kind] ?? "")}</p>
      <form action={formAction} className="flex flex-wrap gap-3">
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="kind" value={kind} />
        <button type="submit" disabled={pending} className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
          {kind === "all" ? copy.unsubscribe.allButton : copy.unsubscribe.button}
        </button>
      </form>
      {kind !== "all" && (
        <form action={formAction} className="flex">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="kind" value="all" />
          <button type="submit" disabled={pending} className="text-sm underline disabled:opacity-50">{copy.unsubscribe.allButton}</button>
        </form>
      )}
      <Link href="/settings" className="text-sm underline">{copy.unsubscribe.settings}</Link>
    </div>
  );
}
