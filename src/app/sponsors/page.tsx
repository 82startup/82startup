import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { SponsorsSection } from "@/components/site/sponsors-section";
import { copy } from "@/lib/copy";
import { getSponsorContact, getSponsors } from "@/lib/site/queries";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: copy.site.sponsors };

export default function SponsorsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-2 text-3xl font-semibold">{copy.site.sponsors}</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">{copy.site.sponsorsIntro}</p>
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <SponsorsContent />
      </Suspense>
    </main>
  );
}

async function SponsorsContent() {
  await connection();
  const [sponsors, contact] = await Promise.all([getSponsors(), getSponsorContact()]);
  if (sponsors.length === 0 && !contact) return <p>{copy.site.emptySponsors}</p>;
  return <SponsorsSection sponsors={sponsors} contact={contact} baseUrl={supabaseEnv().url} />;
}
