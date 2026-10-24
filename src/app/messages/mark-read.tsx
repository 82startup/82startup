"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { markConversationRead } from "./actions";

// Opening a conversation with unread messages marks them read, then reloads so the header number clears.
export function MarkRead({ memberId }: { memberId: string }) {
  const router = useRouter();
  useEffect(() => {
    const data = new FormData();
    data.set("member", memberId);
    void markConversationRead(data).then(() => router.refresh());
  }, [memberId, router]);
  return null;
}
