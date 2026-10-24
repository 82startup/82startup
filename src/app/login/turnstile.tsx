"use client";

import { useEffect, useRef } from "react";

const SCRIPT_ID = "cloudflare-turnstile";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = { render: (el: HTMLElement, options: { sitekey: string }) => string; remove: (id: string) => void };
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Loads Cloudflare's script once and calls back when it is ready.
function whenReady(callback: () => void): () => void {
  if (window.turnstile) {
    callback();
    return () => {};
  }
  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    document.head.appendChild(script);
  }
  script.addEventListener("load", callback);
  return () => script.removeEventListener("load", callback);
}

function Check({ siteKey }: { siteKey: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let widget: string | null = null;
    const stop = whenReady(() => {
      if (box.current && window.turnstile && widget === null) widget = window.turnstile.render(box.current, { sitekey: siteKey });
    });
    return () => {
      stop();
      if (widget !== null) window.turnstile?.remove(widget);
    };
  }, [siteKey]);
  // Inside the form, the check adds the hidden field "cf-turnstile-response" that the sign-in action sends to Supabase.
  return <div ref={box} />;
}

// The Cloudflare Turnstile check for a form. With no site key (local development) nothing is shown and nothing is sent.
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return <Check siteKey={siteKey} />;
}
