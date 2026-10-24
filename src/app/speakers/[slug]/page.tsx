import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { getVisibleEvents } from "@/lib/events/queries";
import { initials } from "@/lib/members/avatar";
import { siteImageUrl } from "@/lib/site/images";
import { getSpeaker } from "@/lib/site/queries";
import { safely } from "@/lib/site/safe";
import { supabaseEnv } from "@/lib/supabase/env";

export async function generateMetadata({ params }: PageProps<"/speakers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const speaker = await safely(() => getSpeaker(slug), null);
  if (!speaker) return { title: copy.site.notFoundTitle };
  return { title: speaker.name, description: [speaker.job_title, speaker.company].filter(Boolean).join(" · ") || undefined };
}

export default function SpeakerPage({ params }: PageProps<"/speakers/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <SpeakerDetail params={params} />
      </Suspense>
    </main>
  );
}

async function SpeakerDetail({ params }: { params: PageProps<"/speakers/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const speaker = await safely(() => getSpeaker(slug), null);
  if (!speaker) notFound();

  const src = siteImageUrl(supabaseEnv().url, speaker.photo_path);
  const detail = [speaker.job_title, speaker.company].filter(Boolean).join(" · ");
  // The events the speaker speaks at that are on the site (hidden events are not shown), soonest first.
  const chosen = new Set(speaker.event_ids);
  const events = chosen.size === 0 ? [] : (await getVisibleEvents()).filter((e) => chosen.has(e.id)).sort((a, b) => a.start_at.localeCompare(b.start_at));

  return (
    <article className="flex flex-col gap-4">
      <Link href="/speakers" className="text-sm text-zinc-600 dark:text-zinc-400">← {copy.site.allSpeakers}</Link>
      <div className="flex items-center gap-5">
        <div className="h-28 w-28 flex-none overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- picture from our own storage bucket; no image optimizer configured
            <img src={src} alt={speaker.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="flex h-full w-full items-center justify-center text-4xl font-semibold text-zinc-500">{initials(speaker.name)}</div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="break-words text-3xl font-semibold">{speaker.name}</h1>
          {detail && <p className="text-zinc-600 dark:text-zinc-400">{detail}</p>}
        </div>
      </div>
      {events.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{copy.site.speaksAt}</h2>
          <ul className="flex flex-col gap-1">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.slug}`} className="underline">{event.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
