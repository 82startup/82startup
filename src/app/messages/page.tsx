import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";

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

  const { data } = await supabase.rpc("my_conversations");
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <p>{copy.messages.empty}</p>;

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
