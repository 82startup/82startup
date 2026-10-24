import { timingSafeEqual } from "node:crypto";
import { runNotifications } from "@/lib/notifications/run";

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Every 5 minutes: sends anything the after-the-action run missed or had to retry.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 500 });
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await runNotifications());
  } catch (error) {
    console.error("send-notifications failed:", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
