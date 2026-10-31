"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

const NEAR_BOTTOM = 80; // px from the end that still counts as reading the latest messages

// The scrolling thread. It opens at the newest message, follows each new one (sent or received) and stays at the end
// when the keyboard opens or closes, unless the member has scrolled up to read older messages.
export function ConversationBody({ latestId, children }: { latestId: string | null; children: ReactNode }) {
  const body = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);

  useLayoutEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
    atEnd.current = true;
  }, [latestId]);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const onScroll = () => { atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM; };
    // A resize (keyboard, rotation, a taller composer) keeps the end in view when it was in view.
    const observer = new ResizeObserver(() => { if (atEnd.current) el.scrollTop = el.scrollHeight; });
    el.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return <div ref={body} className="conversation-body">{children}</div>;
}
