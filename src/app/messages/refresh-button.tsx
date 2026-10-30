"use client";

import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";

export function RefreshButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className="conversation-refresh" aria-label={copy.messages.refresh} title={copy.messages.refresh}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66" /><path d="M20 4v7h-7" /></svg>
    </button>
  );
}
