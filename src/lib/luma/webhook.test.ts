import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseWebhook, verifySignature } from "./webhook";

const SECRET = "whsec_test_secret";
const NOW = new Date("2026-11-01T00:00:00.000Z");
const TS = Math.floor(NOW.getTime() / 1000);
const BODY = '{"type":"event.updated","data":{"id":"evt-abc123"}}';

const sign = (body: string, ts: number, secret = SECRET) => createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
const header = (ts: number, ...sigs: string[]) => `t=${ts},${sigs.map((s) => `v1=${s}`).join(",")}`;
const check = (over: { body?: string; signature?: string | null; secret?: string; now?: Date } = {}) =>
  verifySignature({
    secret: over.secret ?? SECRET,
    body: over.body ?? BODY,
    signature: over.signature === undefined ? header(TS, sign(BODY, TS)) : over.signature,
    now: over.now ?? NOW,
  });

describe("verifySignature", () => {
  it("accepts a correct signature, using the secret exactly as given (whsec_ prefix kept)", () => {
    expect(check()).toBe(true);
    expect(check({ signature: header(TS, sign(BODY, TS, "test_secret")) })).toBe(false);
  });

  it("rejects a wrong secret, a changed body and a changed timestamp", () => {
    expect(check({ secret: "whsec_other" })).toBe(false);
    expect(check({ body: BODY + " " })).toBe(false);
    expect(check({ signature: header(TS + 1, sign(BODY, TS)) })).toBe(false);
  });

  it("rejects a missing or malformed header and a signature of the wrong length", () => {
    for (const signature of [null, "", "garbage", `t=${TS}`, `v1=${sign(BODY, TS)}`, `t=abc,v1=${sign(BODY, TS)}`, header(TS, "abcd"), header(TS, "")]) {
      expect(check({ signature })).toBe(false);
    }
  });

  it("rejects timestamps more than 5 minutes old or in the future, and accepts ones just inside", () => {
    expect(check({ signature: header(TS - 301, sign(BODY, TS - 301)) })).toBe(false);
    expect(check({ signature: header(TS + 301, sign(BODY, TS + 301)) })).toBe(false);
    expect(check({ signature: header(TS - 299, sign(BODY, TS - 299)) })).toBe(true);
    expect(check({ signature: header(TS + 299, sign(BODY, TS + 299)) })).toBe(true);
  });

  it("passes when any one of several v1 values matches, and only then", () => {
    expect(check({ signature: header(TS, "0".repeat(64), sign(BODY, TS)) })).toBe(true);
    expect(check({ signature: header(TS, "0".repeat(64), "1".repeat(64)) })).toBe(false);
  });
});

describe("parseWebhook", () => {
  const body = (type: string, data: unknown) => JSON.stringify({ type, data });

  it("finds the event id for the event types and calendar.event.added in data.id", () => {
    for (const type of ["event.created", "event.updated", "calendar.event.added"]) {
      expect(parseWebhook(body(type, { id: "evt-abc123" }))).toEqual({ action: "refresh", eventId: "evt-abc123" });
    }
  });

  it("maps event.canceled to cancel", () => {
    expect(parseWebhook(body("event.canceled", { id: "evt-abc123" }))).toEqual({ action: "cancel", eventId: "evt-abc123" });
  });

  it("finds the event id for the guest types in data.event.id", () => {
    for (const type of ["guest.registered", "guest.updated"]) {
      expect(parseWebhook(body(type, { event: { id: "evt-abc123" } }))).toEqual({ action: "refresh", eventId: "evt-abc123" });
    }
  });

  it("ignores unknown types, bad JSON, and missing or malformed ids", () => {
    expect(parseWebhook(body("ticket.created", { id: "evt-abc123" }))).toBeNull();
    expect(parseWebhook("not json")).toBeNull();
    expect(parseWebhook("null")).toBeNull();
    expect(parseWebhook(body("event.updated", {}))).toBeNull();
    expect(parseWebhook(body("event.updated", null))).toBeNull();
    expect(parseWebhook(body("event.updated", { id: 5 }))).toBeNull();
    expect(parseWebhook(body("event.updated", { id: "cal-abc" }))).toBeNull();
    expect(parseWebhook(body("event.updated", { id: "evt-../x" }))).toBeNull();
    expect(parseWebhook(body("guest.updated", { id: "evt-abc123" }))).toBeNull();
    expect(parseWebhook(body("event.updated", { event: { id: "evt-abc123" } }))).toBeNull();
  });
});
