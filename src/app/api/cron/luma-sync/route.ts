import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { createEventStore } from "@/lib/events/store";
import { createLumaClient } from "@/lib/luma/client";
import { runSync } from "@/lib/luma/sync";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 500 });
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) return Response.json({ error: "not configured" }, { status: 500 });

  try {
    const result = await runSync(createLumaClient({ apiKey }), createEventStore(createAdminClient()));
    revalidateTag("events", "max");
    return Response.json(result);
  } catch (error) {
    // Log the kind of failure only; messages could carry request details.
    console.error("luma-sync failed:", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "sync failed" }, { status: 502 });
  }
}
