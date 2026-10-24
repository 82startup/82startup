import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";
import { siteImageUrl } from "@/lib/site/images";
import { TIERS, type Sponsor } from "@/lib/site/types";
import { supabaseEnv } from "@/lib/supabase/env";
import { ActionButton } from "../action-button";
import { AdminNav } from "../admin-nav";
import { deleteSponsor, moveSponsor, setSponsorVisible } from "./actions";
import { ContactForm, SponsorForm } from "./sponsor-forms";

export default function AdminSponsorsPage() {
  // Nothing about the screen is in the static shell: a non-admin must not learn it exists.
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <AdminSponsorsContent />
      </Suspense>
    </main>
  );
}

async function AdminSponsorsContent() {
  await connection();
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect("/login?next=/admin/sponsors");
  if (check.status !== "admin") notFound();

  const { data, error } = await supabase.from("sponsors").select("*").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  const sponsors = ((data ?? []) as Sponsor[]).sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "sponsor_contact_url").maybeSingle();
  const baseUrl = supabaseEnv().url;

  return (
    <>
      <AdminNav current="sponsors" />
      <h1 className="mb-4 text-2xl font-semibold">{copy.sponsorsAdmin.title}</h1>

      <section className="mb-8 flex flex-col gap-3 rounded border p-4">
        <h2 className="font-semibold">{copy.sponsorsAdmin.contactTitle}</h2>
        <ContactForm value={setting?.value ?? ""} />
      </section>

      <details className="mb-8 rounded border p-4">
        <summary className="cursor-pointer font-semibold">{copy.sponsorsAdmin.add}</summary>
        <div className="mt-4"><SponsorForm /></div>
      </details>

      {sponsors.length === 0 ? (
        <p>{copy.sponsorsAdmin.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sponsors.map((s) => {
            const logo = siteImageUrl(baseUrl, s.logo_path);
            return (
              <li key={s.id} className="flex flex-col gap-3 rounded border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- picture from our own storage bucket
                    <img src={logo} alt="" className="h-10 w-16 flex-none object-contain" />
                  ) : (
                    <span aria-hidden className="h-10 w-16 flex-none rounded bg-zinc-200 dark:bg-zinc-800" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {copy.sponsorsAdmin.tiers[s.tier]}{!s.visible && ` · ${copy.sponsorsAdmin.hiddenMark}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={moveSponsor} fields={{ id: s.id, direction: "up" }} label={`↑ ${copy.sponsorsAdmin.up}`} />
                    <ActionButton action={moveSponsor} fields={{ id: s.id, direction: "down" }} label={`↓ ${copy.sponsorsAdmin.down}`} />
                    <ActionButton action={setSponsorVisible} fields={{ id: s.id, value: String(!s.visible) }} label={s.visible ? copy.sponsorsAdmin.hide : copy.sponsorsAdmin.show} />
                    <ActionButton action={deleteSponsor} fields={{ id: s.id }} label={copy.sponsorsAdmin.delete} confirm={copy.sponsorsAdmin.confirmDelete} />
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm underline">{copy.sponsorsAdmin.edit}</summary>
                  <div className="mt-3"><SponsorForm sponsor={s} /></div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
