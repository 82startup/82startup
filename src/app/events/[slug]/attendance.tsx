import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { getAttendanceTotal } from "@/lib/events/queries";
import type { PublicEvent } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { setAttending, setListVisibility } from "./actions";
import { EventSwitch } from "./event-switch";

type Mine = { status: "registered" | "cancelled"; source: "luma" | "self"; show_in_list: boolean };
type Attendee = { member_id: string; name: string; job_title: string; company_name: string; avatar_url: string | null };

// "N attending", for everyone. If the attendance functions are not available (for example the database update has not
// been applied yet), the event page still works and simply shows no count.
export async function AttendanceCount({ eventId }: { eventId: string }) {
  let total = 0;
  try {
    total = await getAttendanceTotal(eventId);
  } catch {
    return null;
  }
  if (total <= 0) return null;
  return <p>{total} {copy.attendance.count}</p>;
}

// The buttons for a logged-in member (or the sign-in prompt) and the members-only list.
export async function AttendanceActions({ event }: { event: PublicEvent }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const signedIn = Boolean(claims?.claims.sub);
  const ended = new Date(event.end_at ?? event.start_at) < new Date();

  if (!signedIn) {
    if (ended) return null;
    return (
      <p>
        <Link href={`/login?next=/events/${event.slug}`} className="underline">{copy.attendance.signIn}</Link>
      </p>
    );
  }

  const [mineResult, attendeesResult] = await Promise.all([
    supabase.rpc("my_attendance", { p_event: event.id }),
    supabase.rpc("event_attendees", { p_event: event.id }),
  ]);
  const mine = (mineResult.error ? null : (mineResult.data?.[0] ?? null)) as Mine | null;
  const attendees = (attendeesResult.error ? [] : (attendeesResult.data ?? [])) as Attendee[];

  const registered = mine?.status === "registered";
  const viaLuma = registered && mine?.source === "luma";
  const viaSelf = registered && mine?.source === "self";

  return (
    <div className="flex flex-col gap-4">
      {!ended && (
        <div className="flex flex-wrap items-start gap-3">
          {viaLuma ? (
            <p>{copy.attendance.onLuma}</p>
          ) : (
            <EventSwitch
              action={setAttending}
              eventId={event.id}
              slug={event.slug}
              active={viaSelf}
              label={copy.attendance.attend}
              activeLabel={copy.attendance.cancel}
            />
          )}
          {registered && (
            <EventSwitch
              action={setListVisibility}
              eventId={event.id}
              slug={event.slug}
              active={mine?.show_in_list ?? true}
              label={`${copy.attendance.showInList}: ${copy.attendance.off}`}
              activeLabel={`${copy.attendance.showInList}: ${copy.attendance.on}`}
              toggle
            />
          )}
        </div>
      )}
      {attendees.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{copy.attendance.who}</h2>
          <ul className="flex flex-col gap-1">
            {attendees.map((a) => {
              const detail = [a.job_title, a.company_name].filter(Boolean).join(", ");
              return (
                <li key={a.member_id} className="flex items-center gap-2">
                  <Avatar name={a.name} url={a.avatar_url} size={28} />
                  <span>
                    <span className="font-medium">{a.name || copy.attendance.member}</span>
                    {detail && <span className="text-zinc-600 dark:text-zinc-400"> · {detail}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
