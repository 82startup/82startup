import Link from "next/link";
import { initials } from "@/lib/members/avatar";
import { siteImageUrl } from "@/lib/site/images";
import type { Speaker } from "@/lib/site/types";

// A grid of speaker cards: photo (or initials), name, job title and company, each opening the speaker's page.
export function SpeakersGrid({ speakers, baseUrl }: { speakers: Speaker[]; baseUrl: string }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {speakers.map((s) => {
        const src = siteImageUrl(baseUrl, s.photo_path);
        const detail = [s.job_title, s.company].filter(Boolean).join(" · ");
        return (
          <li key={s.id}>
            <Link href={`/speakers/${s.slug}`} className="group flex flex-col gap-2">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- picture from our own storage bucket; no image optimizer configured
                  <img src={src} alt={s.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div aria-hidden className="flex h-full w-full items-center justify-center text-3xl font-semibold text-zinc-500">{initials(s.name)}</div>
                )}
              </div>
              <span className="font-semibold">{s.name}</span>
              {detail && <span className="text-sm text-zinc-600 dark:text-zinc-400">{detail}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
