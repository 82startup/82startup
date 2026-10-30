import { Suspense, type ReactNode } from "react";
import { copy } from "@/lib/copy";
import { AutoRefresh } from "./auto-refresh";
import { MessagesFrame } from "./messages-frame";
import { ThreadList } from "./thread-list";

// Messages is a two-pane inbox: connections and conversations on the left, the open conversation on the right.
export default function MessagesLayout({ children }: { children: ReactNode }) {
  const list = <Suspense fallback={<p className="messages-list-empty">{copy.messages.loading}</p>}><ThreadList /></Suspense>;
  return (
    <main className="messages-shell">
      <AutoRefresh />
      {/* MessagesFrame reads the pathname, which needs a Suspense boundary; the fallback is the same two panes. */}
      <Suspense fallback={<div className="messages-frame" data-view="list"><aside className="messages-list-pane">{list}</aside><section className="messages-thread-pane">{children}</section></div>}>
        <MessagesFrame list={list}>{children}</MessagesFrame>
      </Suspense>
    </main>
  );
}
