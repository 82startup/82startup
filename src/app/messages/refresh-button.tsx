"use client";

import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";

export function RefreshButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className="rounded border px-3 py-1 text-sm">
      {copy.messages.refresh}
    </button>
  );
}
