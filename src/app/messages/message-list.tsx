import { copy } from "@/lib/copy";

export type ThreadMessage = { id: string; body: string; created_at: string; is_mine: boolean; is_unread: boolean; is_post: boolean };

const TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
const clean = (s: string) => s.replace(/[  ]/g, " ");

// A conversation, oldest first. Bodies are plain text: escaped by React, line breaks kept, links not turned into anchors.
export function MessageList({ messages, name }: { messages: ThreadMessage[]; name: string }) {
  if (messages.length === 0) return <p>{copy.messages.noMessages}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {messages.map((m) => (
        <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 rounded border p-3 ${m.is_mine ? "self-end" : "self-start"}`}>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {m.is_mine ? copy.messages.you : name} · {clean(TIME.format(new Date(m.created_at)))}
            {m.is_post && <span className="ml-2 rounded border px-1.5 py-0.5 text-[11px] uppercase">{copy.posts.label}</span>}
          </span>
          <p className="whitespace-pre-line break-words">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}
