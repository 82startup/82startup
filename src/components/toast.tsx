"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A short notice at the bottom of the screen that fades after a few seconds. It shows again each time `trigger`
// changes (pass the action's result object), so saving twice shows it twice.
export function Toast({ trigger, message, tone = "success" }: { trigger: unknown; message: string | null | undefined; tone?: "success" | "error" }) {
  const [expired, setExpired] = useState<unknown>(null); // the trigger whose toast has already faded
  const visible = Boolean(message) && expired !== trigger;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setExpired(trigger), tone === "error" ? 5000 : 3000);
    return () => window.clearTimeout(timer);
  }, [trigger, message, tone]);

  if (!message || typeof document === "undefined") return null;
  return createPortal(
    <div className="community-toast" data-tone={tone} data-visible={visible || undefined} role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"}>
      {tone === "success" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v6m0 4h.01" /></svg>
      )}
      <span>{message}</span>
    </div>,
    document.body,
  );
}
