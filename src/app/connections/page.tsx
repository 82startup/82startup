import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "./action-form";
import { blockMember, cancelRequest, disconnect, respondToRequest, unblockMember } from "./actions";

export default function ConnectionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{copy.connections.title}</h1>
      <Suspense fallback={<p>{copy.connections.loading}</p>}>
        <Lists />
      </Suspense>
    </main>
  );
}

type Kind = "received" | "sent" | "connected" | "blocked";
type Row = {
  kind: Kind;
  connection_id: string | null;
  member_id: string;
  name: string;
  avatar_url: string | null;
  job_title: string;
  company_name: string;
  note: string;
  profile_visible: boolean;
};

const ORDER: Kind[] = ["received", "sent", "connected", "blocked"];

async function Lists() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/login?next=/connections");

  const { data } = await supabase.rpc("my_connection_lists");
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <p>{copy.connections.empty}</p>;

  return (
    <>
      {ORDER.map((kind) => {
        const list = rows.filter((r) => r.kind === kind);
        if (list.length === 0) return null;
        return (
          <section key={kind} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{copy.connections.sections[kind]} ({list.length})</h2>
            <ul className="flex flex-col gap-3">
              {list.map((row) => (
                <MemberRow key={`${kind}-${row.member_id}`} row={row} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function MemberRow({ row }: { row: Row }) {
  const detail = [row.job_title, row.company_name].filter(Boolean).join(" · ");
  const name = row.name || copy.attendance.member;
  return (
    <li className="flex flex-col gap-2 rounded border p-3">
      <div className="flex items-center gap-3">
        <Avatar name={row.name} url={row.avatar_url} />
        <div className="flex min-w-0 flex-col">
          {row.profile_visible ? (
            <Link href={`/members/${row.member_id}`} className="font-semibold underline">{name}</Link>
          ) : (
            <span className="font-semibold">{name}</span>
          )}
          {detail && <span className="text-sm text-zinc-600 dark:text-zinc-400">{detail}</span>}
        </div>
      </div>
      {row.kind === "received" && row.note && (
        <p className="whitespace-pre-line text-sm"><span className="text-zinc-600 dark:text-zinc-400">{copy.connections.noteFrom}: </span>{row.note}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {row.kind === "received" && row.connection_id && (
          <>
            <ActionForm action={respondToRequest} fields={{ id: row.connection_id, value: "true" }} label={copy.connections.accept} />
            <ActionForm action={respondToRequest} fields={{ id: row.connection_id, value: "false" }} label={copy.connections.decline} />
          </>
        )}
        {row.kind === "sent" && row.connection_id && (
          <ActionForm action={cancelRequest} fields={{ id: row.connection_id }} label={copy.connections.cancel} quiet />
        )}
        {row.kind === "connected" && (
          <>
            <ActionForm action={disconnect} fields={{ member: row.member_id }} label={copy.connections.disconnect} quiet />
            <ActionForm action={blockMember} fields={{ member: row.member_id }} label={copy.connections.block} quiet />
          </>
        )}
        {row.kind === "blocked" && <ActionForm action={unblockMember} fields={{ member: row.member_id }} label={copy.connections.unblock} quiet />}
      </div>
    </li>
  );
}
