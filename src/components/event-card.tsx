import Link from "next/link";
import { formatEventTime, venueLabel } from "@/lib/events/format";
import type { PublicEvent } from "@/lib/events/types";
import { copy } from "@/lib/copy";

export function EventCard({ event }: { event: PublicEvent }) {
  const venue = venueLabel(event);
  return (
    <li>
      <Link href={`/events/${event.slug}`} className="flex gap-4 rounded border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
        {event.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element -- Luma-hosted image; no image optimizer configured
          <img src={event.cover_url} alt={copy.events.cover} loading="lazy" className="h-24 w-24 flex-none rounded object-cover" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-semibold">{event.title}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatEventTime(event.start_at, event.end_at, event.timezone)}</p>
          {venue && <p className="text-sm text-zinc-600 dark:text-zinc-400">{venue}</p>}
        </div>
      </Link>
    </li>
  );
}
