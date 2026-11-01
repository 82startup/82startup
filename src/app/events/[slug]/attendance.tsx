import Link from "next/link";
import { MemberCard, type MemberRow, type Relation } from "@/app/members/member-card";
import { copy } from "@/lib/copy";
import type { PublicEvent } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";

type Attendee = Omit<MemberRow, "id" | "member_type"> & { member_id: string; member_type?: MemberRow["member_type"] };

// Who's attending, as the same cards as the member directory (three columns). The list is members-only in the
// database, so a visitor who is not signed in gets a sign-in prompt instead.
export async function Attendees({ event }: { event: PublicEvent }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewer = claims?.claims.sub;

  if (!viewer) {
    return (
      <section className="event-attendees">
        <h2>{copy.attendance.who}</h2>
        <p className="settings-intro">
          <Link href={`/login?next=/events/${event.slug}`} className="event-detail-link">{copy.attendance.signInToSee}</Link>
        </p>
      </section>
    );
  }

  const [{ data, error }, { data: lists }] = await Promise.all([
    supabase.rpc("event_attendees", { p_event: event.id }),
    supabase.rpc("my_connection_lists"),
  ]);
  const attendees = (error ? [] : (data ?? [])) as Attendee[];
  const relation = new Map<string, Relation>();
  for (const row of (lists ?? []) as Array<{ kind: string; member_id: string }>) {
    if (row.kind === "connected") relation.set(row.member_id, "connected");
    else if (row.kind === "sent" || row.kind === "received") relation.set(row.member_id, "pending");
  }

  return (
    <section className="event-attendees">
      <h2>{copy.attendance.who}{attendees.length > 0 && <span className="community-section-count">{attendees.length}</span>}</h2>
      {attendees.length === 0 ? (
        <p className="settings-intro">{copy.attendance.none}</p>
      ) : (
        <ul className="members-grid">
          {attendees.map((a) => (
            <MemberCard
              key={a.member_id}
              member={{ id: a.member_id, name: a.name || copy.attendance.member, avatar_url: a.avatar_url, job_title: a.job_title, company_name: a.company_name, member_type: a.member_type ?? null }}
              self={a.member_id === viewer}
              relation={relation.get(a.member_id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
