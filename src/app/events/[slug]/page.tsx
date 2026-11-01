import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { getEvent } from "@/lib/events/queries";
import { Attendees } from "./attendance";

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
    <main className="event-page">
      <Suspense fallback={<p className="settings-intro">{copy.events.loading}</p>}>
        <EventDetail params={params} />
      </Suspense>
    </main>
  );
}

// The event date in its own timezone, like "TUE, MAR 16, 2027" (or "WED, MAR 17 – THU, MAR 18, 2027" across days).
function eventDate(startIso: string, endIso: string | null, timeZone: string): string {
  const format = (iso: string, withYear: boolean) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) };
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(new Date(iso));
    } catch {
      return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(new Date(iso));
    }
  };
  const start = format(startIso, true);
  if (!endIso) return start.toUpperCase();
  const end = format(endIso, true);
  return (start === end ? start : `${format(startIso, false)} – ${end}`).toUpperCase();
}

async function EventDetail({ params }: { params: PageProps<"/events/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <>
      <header className="event-detail-head">
        <p className="event-detail-date">{eventDate(event.start_at, event.end_at, event.timezone)}</p>
        <h1>{event.title}</h1>
        <a href={event.luma_url} target="_blank" rel="noopener noreferrer" className="community-action event-detail-tickets">{copy.events.getTickets}</a>
      </header>
      <Attendees event={event} />
    </>
  );
}
