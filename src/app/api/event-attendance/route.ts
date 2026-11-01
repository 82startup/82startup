import { NextResponse } from "next/server";
import { lumaCode } from "@/lib/events/luma";
import { getAttendanceTotal, getAttendeeFaces, getVisibleEvents } from "@/lib/events/queries";
import { safeAvatarUrl } from "@/lib/members/avatar";

// Public attendee counts and recent attendee pictures for the Summit timeline, which loads no Supabase code itself. Each event is keyed by the last
// part of its Luma link (the timeline knows those), with the slug of its community page. A missing Supabase
// configuration or a failed read returns an empty list, and the timeline simply shows no counts.
export async function GET() {
  const headers = { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" };
  try {
    const events = await getVisibleEvents();
    const rows = await Promise.all(
      events.map(async (event) => ({
        luma: lumaCode(event.luma_url),
        slug: event.slug,
        total: await getAttendanceTotal(event.id).catch(() => 0),
        // Newest first; an untrusted or missing picture becomes null and is drawn as a silhouette.
        faces: (await getAttendeeFaces(event.id).catch(() => [])).map((url) => safeAvatarUrl(url)),
      })),
    );
    return NextResponse.json({ events: rows.filter((row) => row.luma) }, { headers });
  } catch {
    return NextResponse.json({ events: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
