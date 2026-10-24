import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { MarkRead } from "../mark-read";
import { MessageForm } from "../message-form";
import { MessageList, type ThreadMessage } from "../message-list";
import { RefreshButton } from "../refresh-button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 50;

export default function ConversationPage({ params, searchParams }: PageProps<"/messages/[memberId]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Suspense fallback={<p>{copy.messages.loading}</p>}>
        <Conversation params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Connected = { kind: string; member_id: string; name: string; avatar_url: string | null; job_title: string; company_name: string };

async function Conversation({ params, searchParams }: { params: PageProps<"/messages/[memberId]">["params"]; searchParams: PageProps<"/messages/[memberId]">["searchParams"] }) {
  await connection();
  const { memberId } = await params;
  const back = <Link href="/messages" className="text-sm text-zinc-600 dark:text-zinc-400">← {copy.messages.backToList}</Link>;
  // A malformed id, an unknown member and a member who is not connected all end on the same page.
  if (!UUID.test(memberId)) return <>{back}<p>{copy.messages.unavailable}</p></>;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect(`/login?next=/messages/${memberId}`);

  const { data: lists } = await supabase.rpc("my_connection_lists");
  const member = ((lists ?? []) as Connected[]).find((r) => r.kind === "connected" && r.member_id === memberId);
  if (!member) return <>{back}<p>{copy.messages.unavailable}</p></>;

  const rawBefore = (await searchParams).before;
  const parsed = typeof rawBefore === "string" ? new Date(rawBefore) : null;
  const before = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;

  const { data } = await supabase.rpc("conversation_messages", { p_with: memberId, p_before: before, p_limit: PAGE });
  const newestFirst = (data ?? []) as ThreadMessage[];
  const messages = [...newestFirst].reverse();
  const hasMore = newestFirst.length === PAGE;
  const detail = [member.job_title, member.company_name].filter(Boolean).join(" · ");
  const name = member.name || copy.attendance.member;

  return (
    <>
      {back}
      <div className="flex items-center gap-3">
        <Avatar name={member.name} url={member.avatar_url} />
        <div className="flex min-w-0 flex-col">
          <h1 className="text-xl font-semibold">{name}</h1>
          {detail && <span className="text-sm text-zinc-600 dark:text-zinc-400">{detail}</span>}
        </div>
      </div>
      {messages.some((m) => m.is_unread) && <MarkRead memberId={memberId} />}
      <div className="flex flex-wrap items-center gap-3">
        <RefreshButton />
        {hasMore && (
          <Link href={`/messages/${memberId}?before=${encodeURIComponent(messages[0].created_at)}`} className="text-sm underline">{copy.messages.earlier}</Link>
        )}
        {before && <Link href={`/messages/${memberId}`} className="text-sm underline">{copy.messages.latest}</Link>}
      </div>
      <MessageList messages={messages} name={name} />
      <MessageForm memberId={memberId} />
    </>
  );
}
