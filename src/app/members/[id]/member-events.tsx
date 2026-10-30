import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatEventTime } from "@/lib/events/format";

export type MemberEvent = {
  event_id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
};

// The upcoming events a member is attending. Nothing is drawn when there are none.
export function MemberEvents({ events }: { events: MemberEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="member-events">
      <h2>{copy.members.attending}</h2>
      <ul>
        {events.map((e) => (
          <li key={e.event_id}>
            <Link href={`/events/${e.slug}`}>{e.title}</Link>
            <span>{formatEventTime(e.start_at, e.end_at, e.timezone)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
