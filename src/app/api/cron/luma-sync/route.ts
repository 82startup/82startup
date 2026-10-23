import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { MissingConfigError, runLumaSync } from "@/lib/luma/run";

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

  try {
    const result = await runLumaSync();
    revalidateTag("events", "max");
    return Response.json(result);
  } catch (error) {
    if (error instanceof MissingConfigError) return Response.json({ error: "not configured" }, { status: 500 });
    // Log the kind of failure only; messages could carry request details.
    console.error("luma-sync failed:", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "sync failed" }, { status: 502 });
  }
}
