import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import type { MemberType } from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/server";
import { MemberEvents, type MemberEvent } from "./member-events";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MemberPage({ params }: PageProps<"/members/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense fallback={<p>{copy.members.loading}</p>}>
        <MemberDetail params={params} />
      </Suspense>
    </main>
  );
}

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

async function MemberDetail({ params }: { params: PageProps<"/members/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  // A malformed id, an unknown member and a hidden member all end on the same not-found page.
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

  return (
    <article className="flex flex-col gap-4">
      <Link href="/members" className="text-sm text-zinc-600 dark:text-zinc-400">← {copy.members.allMembers}</Link>
      <div className="flex items-center gap-4">
        <Avatar name={member.name} url={member.avatar_url} size={72} />
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold">{member.name || copy.attendance.member}</h1>
          {member.job_title && <span>{member.job_title}</span>}
          {member.member_type && <span className="text-sm text-zinc-600 dark:text-zinc-400">{copy.profile.types[member.member_type]}</span>}
        </div>
      </div>
      {member.company_name && (
        <p>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{copy.members.company}: </span>
          {member.company_website ? (
            <a href={member.company_website} target="_blank" rel="noopener noreferrer" className="underline">{member.company_name}</a>
          ) : (
            member.company_name
          )}
        </p>
      )}
      {member.bio && <p className="whitespace-pre-line">{member.bio}</p>}
      {member.linkedin_url && (
        <p>
          <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="underline">{copy.members.linkedin}</a>
        </p>
      )}
      <MemberEvents events={(events ?? []) as MemberEvent[]} />
      {member.id === viewer && (
        <p>
          <Link href="/profile" className="underline">{copy.members.edit}</Link>
        </p>
      )}
    </article>
  );
}
