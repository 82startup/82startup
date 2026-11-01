import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { formatEventTime, venueLabel } from "@/lib/events/format";
import { getAttendanceTotal, getVisibleEvents } from "@/lib/events/queries";
import type { PublicEvent } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";

type Attendee = { member_id: string; name: string; avatar_url: string | null };

const PREVIEW = 5;

export default function EventsPage() {
  return (
    <main className="events-page">
      <header className="event-request-head">
        <h1>{copy.events.title}</h1>
        <p>{copy.events.intro}</p>
      </header>
      <Suspense fallback={<p className="settings-intro">{copy.events.loading}</p>}>
        <EventsList />
      </Suspense>
    </main>
  );
}

async function EventsList() {
  await connection();
  const events = [...(await getVisibleEvents())].sort((a, b) => a.start_at.localeCompare(b.start_at));
  if (events.length === 0) return <p className="settings-intro">{copy.events.emptyUpcoming}</p>;

  // Attendee pictures are for members only (the list itself is protected by the database); everyone sees the counts.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const signedIn = Boolean(claims?.claims.sub);
  const rows = await Promise.all(
    events.map(async (event) => {
      const [total, attendees] = await Promise.all([
        getAttendanceTotal(event.id).catch(() => 0),
        signedIn
          ? supabase.rpc("event_attendees", { p_event: event.id }).then(({ data, error }) => (error ? [] : ((data ?? []) as Attendee[])))
          : Promise.resolve([] as Attendee[]),
      ]);
      return { event, total, attendees };
    }),
  );

  return (
    <ul className="events-list">
      {rows.map(({ event, total, attendees }) => (
        <EventRow key={event.id} event={event} total={total} attendees={attendees} />
      ))}
    </ul>
  );
}

function EventRow({ event, total, attendees }: { event: PublicEvent; total: number; attendees: Attendee[] }) {
  const start = new Date(event.start_at);
  const part = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: event.timezone, ...options }).format(start).toUpperCase();
    } catch {
      return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(start).toUpperCase();
    }
  };
  const where = venueLabel(event);
  const extra = Math.max(total, attendees.length) - Math.min(attendees.length, PREVIEW);

  return (
    <li className="events-row">
      <div className="events-date" aria-hidden="true">
        <span>{part({ month: "short" })}</span>
        <strong>{part({ day: "numeric" })}</strong>
        <span>{part({ weekday: "short" })}</span>
      </div>
      <div className="events-info">
        <Link href={`/events/${event.slug}`} className="events-title">{event.title}</Link>
        <p className="events-meta">{formatEventTime(event.start_at, event.end_at, event.timezone)}{where && <> · {where}</>}</p>
        <div className="events-attending">
          {attendees.length > 0 && (
            <span className="events-faces" aria-hidden="true">
              {attendees.slice(0, PREVIEW).map((a) => (
                <Avatar key={a.member_id} name={a.name} url={a.avatar_url} size={28} />
              ))}
              {extra > 0 && <span className="events-more">+{extra}</span>}
            </span>
          )}
          <span>{total > 0 ? `${total} ${copy.attendance.count}` : copy.events.noAttendees}</span>
        </div>
      </div>
      <div className="events-actions">
        <Link href={`/events/${event.slug}`} className="community-action community-action-secondary">{copy.attendance.who}</Link>
        <a href={event.luma_url} target="_blank" rel="noopener noreferrer" className="community-action">{copy.events.getTickets}</a>
      </div>
    </li>
  );
}
