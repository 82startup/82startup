import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { relativeTime } from "@/lib/messages/relative-time";
import { createClient } from "@/lib/supabase/server";
import { ThreadLink } from "./messages-frame";

type Thread = { member_id: string; last_body: string; last_at: string; unread_count: number | string };
type Connection = { kind: string; member_id: string; name: string; avatar_url: string | null; job_title: string; company_name: string };

// Every accepted connection, so any of them can be messaged: unread conversations first, then the other conversations
// (each newest first), then connections with no messages yet by name.
// The post-to-connections box (PostBox) and recent-posts list are hidden for now; their code is kept.
export async function ThreadList() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/login?next=/messages");

  const [conversations, lists] = await Promise.all([supabase.rpc("my_conversations"), supabase.rpc("my_connection_lists")]);
  const threads = new Map(((conversations.data ?? []) as Thread[]).map((row) => [row.member_id, row]));
  const people = ((lists.data ?? []) as Connection[])
    .filter((row) => row.kind === "connected")
    .map((person) => ({ person, thread: threads.get(person.member_id) ?? null }))
    .sort((x, y) => {
      const xUnread = Number(x.thread?.unread_count ?? 0) > 0;
      const yUnread = Number(y.thread?.unread_count ?? 0) > 0;
      if (xUnread !== yUnread) return xUnread ? -1 : 1;
      if (x.thread && y.thread) return y.thread.last_at.localeCompare(x.thread.last_at);
      if (x.thread || y.thread) return x.thread ? -1 : 1;
      return (x.person.name || "").localeCompare(y.person.name || "");
    });

  return (
    <>
      <header className="messages-list-header">
        <h1>{copy.messages.title}</h1>
        {people.length > 0 && <span>{people.length}</span>}
      </header>
      {people.length === 0 ? (
        <p className="messages-list-empty">{copy.messages.noConnections} <Link href="/members">{copy.nav.members}</Link></p>
      ) : (
        <ul className="messages-list">
          {people.map(({ person, thread }) => {
            const unread = Number(thread?.unread_count ?? 0);
            const detail = [person.job_title, person.company_name].filter(Boolean).join(" · ");
            return (
              <li key={person.member_id}>
                <ThreadLink href={`/messages/${person.member_id}`} unread={unread > 0}>
                  <Avatar name={person.name} url={person.avatar_url} size={52} />
                  <span className="messages-row-copy">
                    <span className="messages-row-name">{person.name || copy.attendance.member}</span>
                    <span className="messages-row-preview">
                      <span className="messages-row-body">{thread ? thread.last_body : detail || copy.messages.startConversation}</span>
                      {thread && <span className="messages-row-time"> · {relativeTime(thread.last_at)}</span>}
                    </span>
                  </span>
                  {unread > 0 && <span className="messages-row-dot" aria-label={`${unread} ${copy.messages.unread}`} />}
                </ThreadLink>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
