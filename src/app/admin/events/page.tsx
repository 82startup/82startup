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

  return (
    <>
      <AdminNav current="events" />
      <h1 className="mb-4 text-2xl font-semibold">{copy.admin.title}</h1>
      <section className="mb-6 flex flex-col gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {copy.admin.lastSync}: {last ? `${last.slice(0, 16).replace("T", " ")} UTC` : copy.admin.never}
        </p>
        <SyncButton />
      </section>
      {events.length === 0 ? (
        <p>{copy.admin.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
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
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
