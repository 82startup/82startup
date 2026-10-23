import { createHmac, timingSafeEqual } from "node:crypto";

// Luma signs `<timestamp>.<raw body>` with HMAC-SHA256 (hex) and the webhook's whsec_ secret, used exactly as given.
const TOLERANCE_SECONDS = 300;
const HEX_SHA256 = /^[0-9a-f]{64}$/;

export function verifySignature({ secret, body, signature, now }: { secret: string; body: string; signature: string | null; now: Date }): boolean {
  if (!signature) return false;

  let timestamp = "";
  const candidates: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value = ""] = part.trim().split("=");
    if (key === "t") timestamp = value;
    else if (key === "v1") candidates.push(value.toLowerCase());
  }
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  // Check every candidate (no early exit) so timing does not reveal which one matched.
  let ok = false;
  for (const candidate of candidates) {
    if (HEX_SHA256.test(candidate) && timingSafeEqual(Buffer.from(candidate, "hex"), expected)) ok = true;
  }
  return ok;
}

export type WebhookAction = { action: "refresh" | "cancel"; eventId: string };

const EVENT_ID = /^evt-[A-Za-z0-9]+$/;
const EVENT_TYPES = new Set(["event.created", "event.updated", "calendar.event.added"]);
const GUEST_TYPES = new Set(["guest.registered", "guest.updated"]);

function idFrom(value: unknown): string | null {
  return typeof value === "string" && EVENT_ID.test(value) ? value : null;
}

// Returns what to do for a webhook body, or null for anything we ignore (unknown type, bad JSON, no usable event id).
export function parseWebhook(body: string): WebhookAction | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { type, data } = parsed as { type?: unknown; data?: { id?: unknown; event?: { id?: unknown } | null } | null };
  if (typeof type !== "string" || !data || typeof data !== "object") return null;

  if (EVENT_TYPES.has(type)) {
    const eventId = idFrom(data.id);
    return eventId ? { action: "refresh", eventId } : null;
  }
  if (type === "event.canceled") {
    const eventId = idFrom(data.id);
    return eventId ? { action: "cancel", eventId } : null;
  }
  if (GUEST_TYPES.has(type)) {
    const eventId = idFrom(data.event?.id);
    return eventId ? { action: "refresh", eventId } : null;
  }
  return null;
}
