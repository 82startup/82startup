import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";

export type ThreadMessage = { id: string; body: string; created_at: string; is_mine: boolean; is_unread: boolean; is_post: boolean };

const TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
const clean = (s: string) => s.replace(/[  ]/g, " ");

const GAP = 60 * 60 * 1000; // a time label is shown above a message sent an hour or more after the one before

// A conversation, oldest first. Bodies are plain text: escaped by React, line breaks kept, links not turned into anchors.
// Messages from the same sender run together; their avatar sits beside the last one of each run.
export function MessageList({ messages, name, avatarUrl = null }: { messages: ThreadMessage[]; name: string; avatarUrl?: string | null }) {
  if (messages.length === 0) return <p className="conversation-empty">{copy.messages.noMessages}</p>;
  return (
    <ul className="conversation-list">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const at = new Date(m.created_at).getTime();
        const showTime = !prev || at - new Date(prev.created_at).getTime() >= GAP;
        const nextBreaks = !next || next.is_mine !== m.is_mine || new Date(next.created_at).getTime() - at >= GAP;
        const startsRun = showTime || !prev || prev.is_mine !== m.is_mine;
        return (
          <li key={m.id} className="conversation-item">
            {showTime && <span className="conversation-time">{clean(TIME.format(new Date(m.created_at)))}</span>}
            <div className="conversation-message" data-mine={m.is_mine || undefined} data-run-start={startsRun || undefined}>
              {!m.is_mine && <span className="conversation-avatar">{nextBreaks && <Avatar name={name} url={avatarUrl} size={28} />}</span>}
              <p className="conversation-bubble whitespace-pre-line break-words">
                <span className="visually-hidden">{m.is_mine ? copy.messages.you : name}: </span>
                {m.body}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
