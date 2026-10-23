import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { getEvent } from "@/lib/events/queries";
import { formatEventTime, venueDetail } from "@/lib/events/format";
import { EventDescription } from "@/components/event-description";
import { AttendanceActions, AttendanceCount } from "./attendance";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: copy.events.notFoundTitle };
  const description = event.description.slice(0, 160) || undefined;
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: event.cover_url ? [event.cover_url] : undefined },
  };
}

export default function EventPage({ params }: PageProps<"/events/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <EventDetail params={params} />
      </Suspense>
    </main>
  );
}

async function EventDetail({ params }: { params: PageProps<"/events/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  const where = venueDetail(event);
  const ended = new Date(event.end_at ?? event.start_at) < new Date();

  return (
    <article className="flex flex-col gap-4">
      <Link href="/events" className="text-sm text-zinc-600 dark:text-zinc-400">← {copy.events.allEvents}</Link>
      {event.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element -- Luma-hosted image; no image optimizer configured
        <img src={event.cover_url} alt={copy.events.cover} className="w-full rounded object-cover" />
      )}
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p>{formatEventTime(event.start_at, event.end_at, event.timezone)}</p>
      {where && <p>{where}</p>}
      <AttendanceCount eventId={event.id} />
      <a
        href={event.luma_url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
      >
        {copy.events.getTickets}
      </a>
      {!ended && <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.attendance.note}</p>}
      <AttendanceActions event={event} />
      <EventDescription markdown={event.description_md} fallback={event.description} />
    </article>
  );
}
