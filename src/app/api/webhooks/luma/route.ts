import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { runLumaCancel, runLumaRefresh } from "@/lib/luma/run";
import { parseWebhook, verifySignature } from "@/lib/luma/webhook";

const MAX_BODY_BYTES = 1_048_576;

// Luma calls this when something changes. Verify, answer 200 at once, refresh after the answer is sent.
// Anything we do not act on is answered 200 too, so Luma does not retry or pause the webhook (never 410).
export async function POST(request: Request) {
  const secret = process.env.LUMA_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 500 });

  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) return Response.json({ error: "too large" }, { status: 413 });
  if (!verifySignature({ secret, body, signature: request.headers.get("webhook-signature"), now: new Date() })) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const work = parseWebhook(body);
  if (work) {
    after(async () => {
      try {
        if (work.action === "cancel") await runLumaCancel(work.eventId);
        else await runLumaRefresh(work.eventId);
        revalidateTag("events", { expire: 0 });
      } catch (error) {
        // Kind only: messages could carry request details. The hourly sync picks the event up.
        console.error("luma-webhook refresh failed:", error instanceof Error ? error.name : "unknown");
      }
    });
  }
  return Response.json({ ok: true });
}
