import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { countText } from "@/lib/posts/text";
import { PostBox } from "./post-box";

export default function MessagesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{copy.messages.title}</h1>
      <Suspense fallback={<p>{copy.messages.loading}</p>}>
        <Conversations />
      </Suspense>
    </main>
  );
}

type Row = { member_id: string; name: string; avatar_url: string | null; last_body: string; last_at: string; unread_count: number };

const TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
const clean = (s: string) => s.replace(/[  ]/g, " ");

async function Conversations() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/login?next=/messages");

  const [conversations, statusResult, postsResult] = await Promise.all([
    supabase.rpc("my_conversations"),
    supabase.rpc("post_status"),
    supabase.rpc("my_posts", { p_limit: 10 }),
  ]);
  const rows = (conversations.data ?? []) as Row[];
  const status = (statusResult.data?.[0] ?? null) as { posts_left: number; next_at: string | null; connection_count: number } | null;
  const posts = (postsResult.data ?? []) as Array<{ id: string; body: string; created_at: string; recipient_count: number }>;

  return (
    <>
      {status && <PostBox connectionCount={status.connection_count} postsLeft={status.posts_left} nextAt={status.next_at} />}
      {rows.length === 0 ? <p>{copy.messages.empty}</p> : <ConversationList rows={rows} />}
      {posts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{copy.posts.recent}</h2>
          <ul className="flex flex-col gap-2">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-col rounded border p-3">
                <span className="line-clamp-2 whitespace-pre-line break-words">{post.body}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {clean(TIME.format(new Date(post.created_at)))} · {countText(copy.posts.sentTo, copy.posts.sentToOne, post.recipient_count)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ConversationList({ rows }: { rows: Row[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const unread = Number(row.unread_count);
        return (
          <li key={row.member_id}>
            <Link href={`/messages/${row.member_id}`} className="flex items-center gap-3 rounded border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <Avatar name={row.name} url={row.avatar_url} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={unread > 0 ? "font-bold" : "font-semibold"}>{row.name || copy.attendance.member}</span>
                <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">{row.last_body}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{clean(TIME.format(new Date(row.last_at)))}</span>
              </div>
              {unread > 0 && <span className="rounded-full bg-black px-2 py-0.5 text-xs text-white dark:bg-white dark:text-black">{unread} {copy.messages.unread}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
