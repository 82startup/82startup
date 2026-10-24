import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { hostLabel } from "@/lib/external/url";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./request-form";
import { WithdrawButton } from "./withdraw-button";

export default function SubmitEventPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{copy.eventRequests.title}</h1>
      <Suspense>
        <SubmitContent />
      </Suspense>
    </main>
  );
}

type Row = {
  id: string;
  url: string;
  host: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  event_slug: string | null;
};

async function SubmitContent() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/login?next=/events/submit");

  const { data } = await supabase.rpc("my_event_requests");
  const rows = (data ?? []) as Row[];

  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.eventRequests.intro}</p>
      <RequestForm />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{copy.eventRequests.yours}</h2>
        {rows.length === 0 ? (
          <p className="text-sm">{copy.eventRequests.none}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 rounded border p-3 text-sm">
                <span className="font-medium">{copy.eventRequests.status[r.status]} · {hostLabel(r.host)}</span>
                <span className="break-all text-zinc-600 dark:text-zinc-400">{r.url}</span>
                {r.note && <span>{r.note}</span>}
                {r.status === "rejected" && r.reject_reason && <span>{copy.eventRequests.reason} {r.reject_reason}</span>}
                {r.status === "approved" && r.event_slug && <Link href={`/events/${r.event_slug}`} className="underline">{copy.eventRequests.viewEvent}</Link>}
                {r.status === "pending" && <WithdrawButton id={r.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
