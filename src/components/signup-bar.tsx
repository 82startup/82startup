"use client";

import { useSyncExternalStore } from "react";
import { copy } from "@/lib/copy";

const KEY = "signup-bar-closed";
const listeners = new Set<() => void>();

// "Closed" is remembered in this browser only. If storage is blocked, the bar simply shows again next time.
function isClosed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function close() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {}
  listeners.forEach((l) => l());
}

// A bar at the bottom of every page. The form goes straight to the Substack subscribe page (new tab, email filled in).
// Substack asks the subscriber to confirm there, so nothing is stored on our side.
export function SignupBar() {
  const closed = useSyncExternalStore(subscribe, isClosed, () => false);
  if (closed) return null;
  return (
    <div className="sticky bottom-0 z-10 mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-white p-3 pl-4 dark:bg-black">
      <span className="text-sm font-medium">{copy.signupBar.text}</span>
      <form action={copy.signupBar.url} method="get" target="_blank" rel="noopener" className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          placeholder={copy.signupBar.placeholder}
          aria-label={copy.signupBar.placeholder}
          className="w-56 rounded border p-1.5 text-sm"
        />
        <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">{copy.signupBar.button}</button>
        <button type="button" onClick={close} aria-label={copy.signupBar.close} className="px-2 py-1 text-lg leading-none">×</button>
      </form>
    </div>
  );
}
