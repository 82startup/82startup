"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The two panes. On narrow screens only one shows: the list on /messages, the conversation on /messages/[id].
export function MessagesFrame({ list, children }: { list: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="messages-frame" data-view={pathname === "/messages" ? "list" : "thread"}>
      <aside className="messages-list-pane">{list}</aside>
      <section className="messages-thread-pane">{children}</section>
    </div>
  );
}

// One row in the list, marked as current while its conversation is open.
export function ThreadLink({ href, unread, children }: { href: string; unread: boolean; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Link href={href} className="messages-row" aria-current={pathname === href ? "page" : undefined} data-unread={unread || undefined}>
      {children}
    </Link>
  );
}
