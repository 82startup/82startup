import Link from "next/link";
import { formatEventTime, venueLabel } from "@/lib/events/format";
import type { PublicEvent } from "@/lib/events/types";
import { copy } from "@/lib/copy";

// `highlight` defaults to the event's own featured flag; the Past tab turns it off so old events are plain.
export function EventCard({ event, highlight = event.featured }: { event: PublicEvent; highlight?: boolean }) {
  const venue = venueLabel(event);
  const when = formatEventTime(event.start_at, event.end_at, event.timezone);

  if (highlight) {
    return (
      <li>
        <Link
          href={`/events/${event.slug}`}
          className="group relative flex min-h-72 overflow-hidden rounded-2xl bg-zinc-900 text-white shadow-lg ring-1 ring-black/10 sm:min-h-96"
        >
          {event.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Luma-hosted image; no image optimizer configured
            <img src={event.cover_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-700 to-black" />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="relative mt-auto flex w-full flex-col items-start gap-2 p-5 sm:gap-3 sm:p-8">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">★ {copy.events.featuredBadge}</span>
            <h2 className="break-words text-2xl font-bold leading-tight sm:text-4xl">{event.title}</h2>
            <p className="text-base text-white/90 sm:text-lg">{when}</p>
            {venue && <p className="text-sm text-white/80 sm:text-base">{venue}</p>}
            <span className="mt-1 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-colors group-hover:bg-amber-400">{copy.events.viewEvent} →</span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link href={`/events/${event.slug}`} className="flex gap-4 rounded border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
        {event.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element -- Luma-hosted image; no image optimizer configured
          <img src={event.cover_url} alt={copy.events.cover} loading="lazy" className="h-24 w-24 flex-none rounded object-cover" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-semibold">{event.title}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{when}</p>
          {venue && <p className="text-sm text-zinc-600 dark:text-zinc-400">{venue}</p>}
        </div>
      </Link>
    </li>
  );
}
