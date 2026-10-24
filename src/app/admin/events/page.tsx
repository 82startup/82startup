import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { getAdmin } from "@/lib/admin/guard";
import { eventFlags, lastSyncedAt, type AdminEvent } from "@/lib/admin/helpers";
import { copy } from "@/lib/copy";
import { formatEventTime } from "@/lib/events/format";
import { setFeatured, setHidden } from "./actions";
import { AdminSwitch } from "./admin-switch";
import { AdminNav } from "../admin-nav";
import { SyncButton } from "./sync-button";
import { AddByLink, ExternalEventTools } from "./external-forms";
import { RequestReview } from "./request-review";
import { hostLabel } from "@/lib/external/url";
import { ZONES, utcToLocalInput } from "@/lib/external/tz";
import type { Preview } from "@/lib/external/form";

export default function AdminEventsPage() {
  // Nothing about the screen is in the static shell: a non-admin must not learn it exists.
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <AdminEventsContent />
      </Suspense>
    </main>
  );
}

async function AdminEventsContent() {
  await connection();
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect("/login?next=/admin/events");
  if (check.status !== "admin") notFound();

  const { data, error } = await supabase.rpc("admin_events");
  if (error) throw new Error(error.message);
  const events = (data ?? []) as AdminEvent[];
  // Luma and self-reported attendee counts. If this call fails the list still works, without the counts.
  const { data: attendance } = await supabase.rpc("admin_attendance");
  const counts = new Map(((attendance ?? []) as { event_id: string; luma: number; self: number }[]).map((row) => [row.event_id, row]));
  const last = lastSyncedAt(events);
  // Members' requests that wait for an answer. If this call fails the page still works without them.
  const { data: requestRows } = await supabase.rpc("admin_event_requests");
  const requests = (requestRows ?? []) as { id: string; url: string; host: string; note: string; details: Preview; created_at: string; requester_name: string; requester_company: string }[];

  return (
    <>
      <AdminNav current="events" pending={requests.length} />
      <h1 className="mb-4 text-2xl font-semibold">{copy.admin.title}</h1>
      <section className="mb-6 flex flex-col gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {copy.admin.lastSync}: {last ? `${last.slice(0, 16).replace("T", " ")} UTC` : copy.admin.never}
        </p>
        <SyncButton />
      </section>
      {requests.length > 0 && (
        <section className="mb-6 flex flex-col gap-3 rounded border-2 p-4" aria-labelledby="requests-title">
          <h2 id="requests-title" className="font-semibold">{copy.admin.requests.title} ({requests.length})</h2>
          <ul className="flex flex-col gap-4">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 text-sm">
                <span>{copy.admin.requests.from} {r.requester_name}{r.requester_company ? `, ${r.requester_company}` : ""} · {r.created_at.slice(0, 10)}</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="break-all underline">{r.url}</a>
                {r.note && <span>{copy.admin.requests.note} {r.note}</span>}
                <RequestReview id={r.id} details={{ ...r.details, url: r.url, host: r.host }} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <details className="mb-6 rounded border p-4">
        <summary className="cursor-pointer font-semibold">{copy.externalAdmin.title}</summary>
        <div className="mt-4"><AddByLink /></div>
      </details>
      {events.length === 0 ? (
        <p>{copy.admin.empty}</p>
      ) : (
        <ul id="events-list" className="flex scroll-mt-4 flex-col gap-3">
          {events.map((event) => {
            const flags = eventFlags(event);
            const isPublic = !event.hidden && !event.removed_from_luma && event.status === "published";
            return (
              <li key={event.id} className="flex flex-col gap-2 rounded border p-3">
                <div className="flex flex-col gap-1">
                  {isPublic ? (
                    <Link href={`/events/${event.slug}`} className="font-semibold underline">{event.title}</Link>
                  ) : (
                    <span className="font-semibold">{event.title}</span>
                  )}
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatEventTime(event.start_at, event.end_at, event.timezone)}
                  </span>
                  {counts.has(event.id) && (
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {copy.admin.attendance.luma}: {counts.get(event.id)?.luma} · {copy.admin.attendance.self}: {counts.get(event.id)?.self}
                    </span>
                  )}
                  {event.source === "external" && event.external_host && (
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{copy.externalAdmin.from} {hostLabel(event.external_host)}</span>
                  )}
                  {flags.length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-xs">
                      {flags.map((flag) => (
                        <li key={flag} className="rounded bg-zinc-200 px-2 py-0.5 dark:bg-zinc-800">{copy.admin.flags[flag]}</li>
                      ))}
                    </ul>
                  )}
                  {event.luma_sync_status === "error" && event.luma_sync_error && (
                    <span className="text-sm text-red-700">{event.luma_sync_error}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <AdminSwitch action={setFeatured} id={event.id} active={event.featured} label={copy.admin.featured} />
                  <AdminSwitch action={setHidden} id={event.id} active={event.hidden} label={copy.admin.hidden} />
                </div>
                {event.source === "external" && event.external_url && <ExternalEventTools id={event.id} initial={previewOf(event)} hidden={event.hidden} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// The stored details of an external event as the values of its edit form (times shown in the event's own zone).
function previewOf(e: AdminEvent): Preview {
  const timezone = (ZONES as readonly string[]).includes(e.timezone) ? e.timezone : "UTC";
  return {
    url: e.external_url ?? "",
    host: e.external_host ?? "",
    title: e.title,
    description: e.description,
    timezone,
    start: utcToLocalInput(e.start_at, timezone),
    end: e.end_at ? utcToLocalInput(e.end_at, timezone) : "",
    locationType: (["online", "offline", "unknown"].includes(e.location_type) ? e.location_type : "unknown") as Preview["locationType"],
    venueName: e.venue_name ?? "",
    venueCity: e.venue_city ?? "",
    venueAddress: e.venue_address ?? "",
    coverUrl: e.cover_url ?? "",
  };
}
