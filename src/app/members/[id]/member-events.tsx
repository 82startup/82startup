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
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{copy.members.attending}</h2>
      <ul className="flex flex-col gap-2">
        {events.map((e) => (
          <li key={e.event_id} className="flex flex-col">
            <Link href={`/events/${e.slug}`} className="underline">{e.title}</Link>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{formatEventTime(e.start_at, e.end_at, e.timezone)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
