import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { SpeakersGrid } from "@/components/site/speakers-grid";
import { copy } from "@/lib/copy";
import { getSpeakers } from "@/lib/site/queries";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: copy.site.speakers };

export default function SpeakersPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-2 text-3xl font-semibold">{copy.site.speakers}</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">{copy.site.speakersIntro}</p>
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <SpeakersContent />
      </Suspense>
    </main>
  );
}

async function SpeakersContent() {
  await connection();
  const speakers = await getSpeakers();
  if (speakers.length === 0) return <p>{copy.site.emptySpeakers}</p>;
  return <SpeakersGrid speakers={speakers} baseUrl={supabaseEnv().url} />;
}
