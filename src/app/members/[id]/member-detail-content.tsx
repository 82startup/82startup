import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import type { MemberType } from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/server";
import { ConnectionPanel } from "@/app/connections/connection-panel";
import { MemberEvents, type MemberEvent } from "./member-events";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Member = {
  id: string;
  name: string;
  avatar_url: string | null;
  job_title: string;
  company_name: string;
  company_website: string | null;
  bio: string;
  linkedin_url: string | null;
  member_type: MemberType | null;
};

function WebsiteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3a14 14 0 0 1 0 18m0-18a14 14 0 0 0 0 18"/></svg>;
}

function LinkedInIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="member-linkedin-icon"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>;
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.8-.8 4 4-.8L19.8 7.4a2.12 2.12 0 0 0-3-3L4 16.8Z"/><path d="m14.9 6.3 3 3"/></svg>;
}

export async function MemberDetailContent({ params, showBack = false }: {
  params: PageProps<"/members/[id]">["params"];
  showBack?: boolean;
}) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewer = claims?.claims.sub;
  if (!viewer) redirect(`/login?next=/members/${id}`);

  const { data } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, job_title, company_name, company_website, bio, linkedin_url, member_type")
    .eq("id", id)
    .maybeSingle();
  const member = data as Member | null;
  if (!member) notFound();

  const { data: events } = await supabase.rpc("member_events", { p_member: id });
  const { data: stateData } = await supabase.rpc("connection_state", { p_member: id });
  const state = typeof stateData === "string" ? stateData : "unavailable";
  let connectionId: string | null = null;
  let note = "";
  if (state === "sent" || state === "received") {
    const { data: lists } = await supabase.rpc("my_connection_lists");
    const open = ((lists ?? []) as Array<{ kind: string; connection_id: string | null; member_id: string; note: string }>).find(
      (row) => row.member_id === id && (row.kind === "sent" || row.kind === "received"),
    );
    connectionId = open?.connection_id ?? null;
    note = open?.note ?? "";
  }

  return (
    <article className="member-detail">
      {showBack && <Link href="/members" className="member-detail-back">← {copy.members.allMembers}</Link>}
      <header className="member-detail-header">
        <Avatar name={member.name} url={member.avatar_url} size={96} />
        <div className="member-detail-identity">
          <h1>{member.name || copy.attendance.member}</h1>
          {member.job_title && <p className="member-detail-job">{member.job_title}</p>}
          {member.member_type && <span className="member-type-tag">{copy.profile.types[member.member_type]}</span>}
        </div>
        {member.id === viewer && (
          <Link href="/profile" className="member-icon-link member-edit-link" aria-label={copy.members.edit} title={copy.members.edit}><EditIcon /></Link>
        )}
      </header>

      {member.company_name && (
        <p className="member-detail-company"><span>{copy.members.company}</span>{member.company_name}</p>
      )}
      {member.bio && <p className="member-detail-bio">{member.bio}</p>}

      {(member.company_website || member.linkedin_url) && (
        <nav className="member-social-links" aria-label="Social links">
          {member.company_website && <a href={member.company_website} target="_blank" rel="noopener noreferrer" className="member-icon-link" aria-label={`${member.company_name || "Company"} website`} title={`${member.company_name || "Company"} website`}><WebsiteIcon /></a>}
          {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="member-icon-link" aria-label="LinkedIn profile" title="LinkedIn"><LinkedInIcon /></a>}
        </nav>
      )}

      <MemberEvents events={(events ?? []) as MemberEvent[]} />
      <ConnectionPanel memberId={id} name={member.name} state={state} connectionId={connectionId} note={note} />
    </article>
  );
}
