import Link from "next/link";
import { copy } from "@/lib/copy";
import { eventDateBadge, formatEventTime } from "@/lib/events/format";

export type MemberEvent = {
  event_id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
};

// The upcoming events a member is attending: a date badge, then title and time. Nothing is drawn when there are none.
export function MemberEvents({ events }: { events: MemberEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="member-events">
      <h2>{copy.members.attending}<span>{events.length}</span></h2>
      <ul>
        {events.map((e) => {
          const d = eventDateBadge(e.start_at, e.end_at, e.timezone);
          return (
            <li key={e.event_id}>
              <Link href={`/events/${e.slug}`} title={formatEventTime(e.start_at, e.end_at, e.timezone)}>
                <span className="member-event-date" data-range={d.day.includes("–") || undefined} aria-hidden="true">
                  <span>{d.month}</span>
                  <strong>{d.day}</strong>
                  <span>{d.weekday}</span>
                </span>
                <span className="member-event-copy">
                  <strong>{e.title}</strong>
                  <span>
                    <span className="visually-hidden">{d.weekday} {d.month} {d.day} · </span>
                    {d.time}
                  </span>
                </span>
                <svg className="member-event-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
