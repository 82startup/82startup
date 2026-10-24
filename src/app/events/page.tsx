import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EventCard } from "@/components/event-card";
import { copy } from "@/lib/copy";
import { getVisibleEvents } from "@/lib/events/queries";
import { splitEvents } from "@/lib/events/split";

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{copy.events.title}</h1>
        <Link href="/events/submit" className="text-sm underline">{copy.eventRequests.suggestLink}</Link>
      </div>
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <EventsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EventsContent({ searchParams }: { searchParams: PageProps<"/events">["searchParams"] }) {
  await connection();
  const { tab } = await searchParams;
  const showPast = tab === "past";
  const { upcoming, past } = splitEvents(await getVisibleEvents(), new Date());
  const events = showPast ? past : upcoming;

  const tabClass = (active: boolean) =>
    active ? "border-b-2 border-black font-semibold dark:border-white" : "text-zinc-600 dark:text-zinc-400";

  return (
    <>
      <nav className="mb-4 flex gap-6">
        <Link href="/events" className={tabClass(!showPast)}>{copy.events.upcoming}</Link>
        <Link href="/events?tab=past" className={tabClass(showPast)}>{copy.events.past}</Link>
      </nav>
      {events.length === 0 ? (
        <p>{showPast ? copy.events.emptyPast : copy.events.emptyUpcoming}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => <EventCard key={event.slug} event={event} highlight={showPast ? false : undefined} />)}
        </ul>
      )}
    </>
  );
}
