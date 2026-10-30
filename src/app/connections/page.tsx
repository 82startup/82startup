import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "./action-form";
import { MoreMenu } from "./more-menu";
import { blockMember, cancelRequest, disconnect, respondToRequest, unblockMember } from "./actions";

export default function ConnectionsPage() {
  return (
    <main className="connections-page">
      <h1>{copy.connections.title}</h1>
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
          <section key={kind} className="connections-section">
            <h2>{copy.connections.sections[kind]}<span>{list.length}</span></h2>
            <ul className="connections-list">
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
    <li className="connection-row">
      <div className="connection-row-member">
        <Avatar name={row.name} url={row.avatar_url} />
        <div className="connection-row-copy">
          {row.profile_visible ? (
            <Link href={`/members/${row.member_id}`} className="connection-row-name">{name}</Link>
          ) : (
            <span className="connection-row-name">{name}</span>
          )}
          {detail && <span className="connection-row-detail">{detail}</span>}
        </div>
      </div>
      {row.kind === "received" && row.note && (
        <p className="connection-note"><span>{copy.connections.noteFrom}</span>{row.note}</p>
      )}
      <div className="connection-row-actions">
        {row.kind === "received" && row.connection_id && (
          <>
            <ActionForm action={respondToRequest} fields={{ id: row.connection_id, value: "true" }} label={copy.connections.accept} />
            <ActionForm action={respondToRequest} fields={{ id: row.connection_id, value: "false" }} label={copy.connections.decline} secondary />
          </>
        )}
        {row.kind === "sent" && row.connection_id && (
          <ActionForm action={cancelRequest} fields={{ id: row.connection_id }} label={copy.connections.cancel} quiet />
        )}
        {row.kind === "connected" && (
          <>
            <Link href={`/messages/${row.member_id}`} className="community-action">{copy.messages.message}</Link>
            <MoreMenu label={copy.connections.more}>
              <ActionForm action={disconnect} fields={{ member: row.member_id }} label={copy.connections.disconnect} quiet />
              <ActionForm action={blockMember} fields={{ member: row.member_id }} label={copy.connections.block} quiet />
            </MoreMenu>
          </>
        )}
        {row.kind === "blocked" && <ActionForm action={unblockMember} fields={{ member: row.member_id }} label={copy.connections.unblock} quiet />}
      </div>
    </li>
  );
}
