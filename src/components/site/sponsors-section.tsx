import { copy } from "@/lib/copy";
import { siteImageUrl } from "@/lib/site/images";
import { groupSponsorsByTier } from "@/lib/site/order";
import type { Sponsor } from "@/lib/site/types";

const HTTPS = /^https:\/\/\S+$/;
const CONTACT = /^(https:\/\/\S+|mailto:\S+@\S+)$/;

// `nameFallback`: tiers that show only the logo write the name when there is none; the others show the name next to it anyway.
function Logo({ sponsor, baseUrl, className, nameFallback = false }: { sponsor: Sponsor; baseUrl: string; className: string; nameFallback?: boolean }) {
  const src = siteImageUrl(baseUrl, sponsor.logo_path);
  if (!src) return nameFallback ? <span className="text-lg font-semibold">{sponsor.name}</span> : null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- picture from our own storage bucket; no image optimizer configured
    <img src={src} alt={sponsor.name} loading="lazy" referrerPolicy="no-referrer" className={className} />
  );
}

function Website({ url, children }: { url: string | null; children: React.ReactNode }) {
  if (!url || !HTTPS.test(url)) return <>{children}</>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
      {children}
    </a>
  );
}

// The sponsors grouped by tier: platinum and diamond large, gold medium, silver and bronze as logos. Tiers with nobody in them are left out.
export function SponsorsSection({ sponsors, contact, baseUrl }: { sponsors: Sponsor[]; contact: string | null; baseUrl: string }) {
  const groups = groupSponsorsByTier(sponsors);
  return (
    <div className="flex flex-col gap-10">
      {groups.map(({ tier, sponsors: list }) => (
        <section key={tier} className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{copy.site.tiers[tier]}</h2>
          {(tier === "platinum" || tier === "diamond") && (
            <ul className="flex flex-col gap-4">
              {list.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 rounded-2xl border p-6 sm:flex-row sm:items-center sm:gap-8">
                  <div className="flex h-24 w-full flex-none items-center justify-center sm:w-56">
                    <Website url={s.website_url}>
                      <Logo sponsor={s} baseUrl={baseUrl} className="max-h-24 max-w-full object-contain" />
                    </Website>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="text-xl font-semibold">{s.name}</h3>
                    {s.description && <p className="whitespace-pre-line break-words text-zinc-700 dark:text-zinc-300">{s.description}</p>}
                    {s.website_url && HTTPS.test(s.website_url) && (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">{copy.site.visit} →</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {tier === "gold" && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {list.map((s) => (
                <li key={s.id} className="flex flex-col items-center gap-3 rounded-xl border p-5 text-center">
                  <Website url={s.website_url}>
                    <Logo sponsor={s} baseUrl={baseUrl} className="h-16 max-w-full object-contain" />
                  </Website>
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.description && <p className="line-clamp-2 break-words text-sm text-zinc-600 dark:text-zinc-400">{s.description}</p>}
                </li>
              ))}
            </ul>
          )}
          {(tier === "silver" || tier === "bronze") && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {list.map((s) => (
                <li key={s.id} className="flex h-20 items-center justify-center rounded-lg border p-3 text-center text-sm">
                  <Website url={s.website_url}>
                    <Logo sponsor={s} baseUrl={baseUrl} className="max-h-14 max-w-full object-contain" nameFallback />
                  </Website>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {contact && CONTACT.test(contact) && (
        <section className="flex flex-col items-start gap-3 rounded-2xl bg-zinc-100 p-6 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold">{copy.site.reachOutTitle}</h2>
          <a href={contact} {...(contact.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black">
            {copy.site.reachOut}
          </a>
        </section>
      )}
    </div>
  );
}
