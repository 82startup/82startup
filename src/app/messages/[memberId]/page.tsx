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
    <Suspense fallback={<p className="messages-list-empty">{copy.messages.loading}</p>}>
      <Conversation params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Connected = { kind: string; member_id: string; name: string; avatar_url: string | null; job_title: string; company_name: string };

async function Conversation({ params, searchParams }: { params: PageProps<"/messages/[memberId]">["params"]; searchParams: PageProps<"/messages/[memberId]">["searchParams"] }) {
  await connection();
  const { memberId } = await params;
  const back = <Link href="/messages" className="conversation-back" aria-label={copy.messages.backToList}>←</Link>;
  // A malformed id, an unknown member and a member who is not connected all end on the same page.
  if (!UUID.test(memberId)) return <div className="messages-placeholder">{back}<p>{copy.messages.unavailable}</p></div>;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect(`/login?next=/messages/${memberId}`);

  const rawBefore = (await searchParams).before;
  const parsed = typeof rawBefore === "string" ? new Date(rawBefore) : null;
  const before = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;

  // Both load together; the messages are only shown once the member is confirmed as a connection.
  const [{ data: lists }, { data }] = await Promise.all([
    supabase.rpc("my_connection_lists"),
    supabase.rpc("conversation_messages", { p_with: memberId, p_before: before, p_limit: PAGE }),
  ]);
  const member = ((lists ?? []) as Connected[]).find((r) => r.kind === "connected" && r.member_id === memberId);
  if (!member) return <div className="messages-placeholder">{back}<p>{copy.messages.unavailable}</p></div>;
  const newestFirst = (data ?? []) as ThreadMessage[];
  const messages = [...newestFirst].reverse();
  const hasMore = newestFirst.length === PAGE;
  const detail = [member.job_title, member.company_name].filter(Boolean).join(" · ");
  const name = member.name || copy.attendance.member;

  return (
    <>
      <div className="conversation">
        <header className="conversation-header">
          {back}
          <Link href={`/members/${memberId}`} className="conversation-member">
            <Avatar name={member.name} url={member.avatar_url} size={44} />
            <span className="conversation-member-copy">
              <h1>{name}</h1>
              {detail && <span>{detail}</span>}
            </span>
          </Link>
          <RefreshButton />
        </header>
        {messages.some((m) => m.is_unread) && <MarkRead memberId={memberId} />}
        <div className="conversation-body">
          {(hasMore || before) && (
            <div className="conversation-paging">
              {hasMore && <Link href={`/messages/${memberId}?before=${encodeURIComponent(messages[0].created_at)}`}>{copy.messages.earlier}</Link>}
              {before && <Link href={`/messages/${memberId}`}>{copy.messages.latest}</Link>}
            </div>
          )}
          <MessageList messages={messages} name={name} avatarUrl={member.avatar_url} />
        </div>
        <MessageForm memberId={memberId} />
      </div>
    </>
  );
}
