import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EventCard } from "@/components/event-card";
import { copy } from "@/lib/copy";
import { pickHomeEvents } from "@/lib/events/home";
import { getVisibleEvents } from "@/lib/events/queries";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <section className="mb-10 flex flex-col items-start gap-4">
        <h1 className="text-3xl font-semibold">{copy.siteName}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{copy.home.tagline}</p>
        <Link href="/events" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
          {copy.home.browse}
        </Link>
      </section>
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <HomeEvents />
      </Suspense>
    </main>
  );
}

async function HomeEvents() {
  await connection();
  const { featured, upcoming } = pickHomeEvents(await getVisibleEvents(), new Date());

  return (
    <>
      {featured.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">{copy.home.featured}</h2>
          <ul className="flex flex-col gap-4">
            {featured.map((event) => <EventCard key={event.slug} event={event} highlight />)}
          </ul>
        </section>
      )}
      {(upcoming.length > 0 || featured.length === 0) && (
        <section className="mb-4">
          <h2 className="mb-3 text-xl font-semibold">{copy.home.upcoming}</h2>
          {upcoming.length === 0 ? (
            <p>{copy.home.empty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((event) => <EventCard key={event.slug} event={event} />)}
            </ul>
          )}
        </section>
      )}
      <Link href="/events" className="underline">{copy.home.seeAll}</Link>
    </>
  );
}
