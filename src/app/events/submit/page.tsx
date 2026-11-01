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
    <main className="settings-page event-request-page">
      <header className="event-request-head">
        <h1>{copy.eventRequests.title}</h1>
        <p>{copy.eventRequests.intro}</p>
      </header>
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
      <section className="settings-card">
        <RequestForm />
      </section>
      <section className="settings-card">
        <h2>{copy.eventRequests.yours}</h2>
        {rows.length === 0 ? (
          <p className="settings-intro">{copy.eventRequests.none}</p>
        ) : (
          <ul className="event-request-list">
            {rows.map((r) => (
              <li key={r.id} className="event-request-row">
                <div className="event-request-info">
                  <div className="event-request-meta">
                    <span className="event-request-status" data-status={r.status}>{copy.eventRequests.status[r.status]}</span>
                    <span className="event-request-host">{hostLabel(r.host)}</span>
                  </div>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="event-request-url">{r.url}</a>
                  {r.note && <p className="event-request-note">{r.note}</p>}
                  {r.status === "rejected" && r.reject_reason && <p className="event-request-note">{copy.eventRequests.reason} {r.reject_reason}</p>}
                </div>
                {r.status === "approved" && r.event_slug && <Link href={`/events/${r.event_slug}`} className="community-action community-action-secondary">{copy.eventRequests.viewEvent}</Link>}
                {r.status === "pending" && <WithdrawButton id={r.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
