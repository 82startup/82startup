"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EVERY = 15_000;

// Reloads the inbox every 15 seconds while the tab is visible, so a newly received message moves to the top
// and appears in the open conversation without pressing refresh. Returning to the tab reloads at once.
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(tick, EVERY);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);
  return null;
}
