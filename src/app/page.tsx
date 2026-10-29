import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EventCard } from "@/components/event-card";
import { copy } from "@/lib/copy";
import { pickHomeEvents } from "@/lib/events/home";
import { getVisibleEvents } from "@/lib/events/queries";
import { safely } from "@/lib/site/safe";
import { getSpeakers, getSponsorContact, getSponsors } from "@/lib/site/queries";
import { SpeakersGrid } from "@/components/site/speakers-grid";
import { SponsorsSection } from "@/components/site/sponsors-section";
import { supabaseEnv } from "@/lib/supabase/env";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense>
        <HomeFeatured />
      </Suspense>
      <section className="mb-10 flex flex-col items-start gap-4">
        <h1 className="text-3xl font-semibold">{copy.siteName}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{copy.home.tagline}</p>
        <Link href="/members" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
          {copy.nav.members}
        </Link>
      </section>
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <HomeUpcoming />
      </Suspense>
      <Suspense>
        <HomeSpeakers />
      </Suspense>
      <Suspense>
        <HomeSponsors />
      </Suspense>
    </main>
  );
}

// The featured events come first, above everything else on the page.
async function HomeFeatured() {
  await connection();
  const { featured } = pickHomeEvents(await getVisibleEvents(), new Date());
  if (featured.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold">{copy.home.featured}</h2>
      <ul className="flex flex-col gap-4">
        {featured.map((event) => <EventCard key={event.slug} event={event} highlight />)}
      </ul>
    </section>
  );
}

async function HomeUpcoming() {
  await connection();
  const { featured, upcoming } = pickHomeEvents(await getVisibleEvents(), new Date());

  return (
    <>
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
      <Link href="/members" className="underline">{copy.nav.members}</Link>
    </>
  );
}

// Featured speakers and the sponsors, only when there is something to show.
async function HomeSpeakers() {
  await connection();
  const speakers = (await safely(getSpeakers, [])).slice(0, 8);
  if (speakers.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-semibold">{copy.site.featuredSpeakers}</h2>
      <SpeakersGrid speakers={speakers} baseUrl={supabaseEnv().url} />
      <Link href="/speakers" className="mt-4 inline-block underline">{copy.site.seeAll} →</Link>
    </section>
  );
}

async function HomeSponsors() {
  await connection();
  const [sponsors, contact] = await Promise.all([safely(getSponsors, []), safely(getSponsorContact, null)]);
  if (sponsors.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-semibold">{copy.site.featuredSponsors}</h2>
      <SponsorsSection sponsors={sponsors} contact={contact} baseUrl={supabaseEnv().url} />
      <Link href="/sponsors" className="mt-4 inline-block underline">{copy.site.seeAll} →</Link>
    </section>
  );
}
