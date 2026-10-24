import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";
import { getVisibleEvents } from "@/lib/events/queries";
import { siteImageUrl } from "@/lib/site/images";
import type { Speaker } from "@/lib/site/types";
import { supabaseEnv } from "@/lib/supabase/env";
import { ActionButton } from "../action-button";
import { AdminNav } from "../admin-nav";
import { deleteSpeaker, moveSpeaker, setSpeakerVisible } from "./actions";
import { SpeakerForm } from "./speaker-form";

export default function AdminSpeakersPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <AdminSpeakersContent />
      </Suspense>
    </main>
  );
}

async function AdminSpeakersContent() {
  await connection();
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect("/login?next=/admin/speakers");
  if (check.status !== "admin") notFound();

  const { data, error } = await supabase.from("speakers").select("*").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  const speakers = (data ?? []) as Speaker[];
  const events = (await getVisibleEvents()).map((e) => ({ id: e.id, title: e.title }));
  const baseUrl = supabaseEnv().url;

  return (
    <>
      <AdminNav current="speakers" />
      <h1 className="mb-4 text-2xl font-semibold">{copy.speakersAdmin.title}</h1>

      <details className="mb-8 rounded border p-4">
        <summary className="cursor-pointer font-semibold">{copy.speakersAdmin.add}</summary>
        <div className="mt-4"><SpeakerForm events={events} /></div>
      </details>

      {speakers.length === 0 ? (
        <p>{copy.speakersAdmin.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {speakers.map((s) => {
            const photo = siteImageUrl(baseUrl, s.photo_path);
            return (
              <li key={s.id} className="flex flex-col gap-3 rounded border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- picture from our own storage bucket
                    <img src={photo} alt="" className="h-12 w-12 flex-none rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="h-12 w-12 flex-none rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {[s.job_title, s.company].filter(Boolean).join(" · ")}{!s.visible && ` · ${copy.sponsorsAdmin.hiddenMark}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={moveSpeaker} fields={{ id: s.id, direction: "up" }} label={`↑ ${copy.sponsorsAdmin.up}`} />
                    <ActionButton action={moveSpeaker} fields={{ id: s.id, direction: "down" }} label={`↓ ${copy.sponsorsAdmin.down}`} />
                    <ActionButton action={setSpeakerVisible} fields={{ id: s.id, value: String(!s.visible) }} label={s.visible ? copy.sponsorsAdmin.hide : copy.sponsorsAdmin.show} />
                    <ActionButton action={deleteSpeaker} fields={{ id: s.id }} label={copy.sponsorsAdmin.delete} confirm={copy.speakersAdmin.confirmDelete} />
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm underline">{copy.sponsorsAdmin.edit}</summary>
                  <div className="mt-3"><SpeakerForm speaker={s} events={events} /></div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
