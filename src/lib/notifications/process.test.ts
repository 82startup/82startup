import { describe, expect, it, vi } from "vitest";
import { processNotifications, type ClaimedEvent } from "./process";

const NOW = new Date("2026-11-01T12:00:00.000Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

function event(over: Partial<ClaimedEvent> = {}): ClaimedEvent {
  return {
    id: "e1",
    recipient_id: "r1",
    kind: "message",
    actor_id: "a1",
    actor_name: "Ann A",
    actor_job_title: "CEO",
    actor_company: "Acme",
    preview: "hello",
    created_at: ago(1),
    attempts: 0,
    kind_enabled_at: ago(600),
    on_requests: false,
    on_accepted: false,
    on_messages: true,
    on_posts: false,
    unsubscribe_code: "c".repeat(64),
    last_sent_at: null,
    ...over,
  };
}

function setup(events: ClaimedEvent[], opts: { email?: string | null | "throw"; sendError?: boolean } = {}) {
  const finished: Array<[string, string]> = [];
  const sent: Array<{ to: string; subject: string; text: string }> = [];
  const store = {
    claim: vi.fn(async () => events),
    finish: vi.fn(async (id: string, outcome: string) => {
      finished.push([id, outcome]);
    }),
  };
  const sender = {
    send: vi.fn(async (mail: { to: string; subject: string; text: string }) => {
      if (opts.sendError) throw new Error("boom");
      sent.push(mail);
    }),
  };
  const getEmail = vi.fn(async () => {
    if (opts.email === "throw") throw new Error("lookup failed");
    return "email" in opts ? opts.email ?? null : "bo@x.test";
  });
  const run = () => processNotifications({ store, sender, getEmail, siteUrl: "https://82startup.vercel.app", now: NOW });
  return { run, finished, sent, getEmail, store };
}

describe("processNotifications", () => {
  it("sends a wanted notification and marks it sent", async () => {
    const t = setup([event()]);
    const result = await t.run();
    expect(result).toMatchObject({ sent: 1, skipped: 0, retried: 0 });
    expect(t.finished).toEqual([["e1", "sent"]]);
    expect(t.sent[0].to).toBe("bo@x.test");
    expect(t.sent[0].subject).toBe("New message from Ann A");
  });

  it("skips a kind the member has not ticked, without even looking up the address", async () => {
    const t = setup([event({ kind_enabled_at: null, on_messages: false })]);
    await t.run();
    expect(t.finished).toEqual([["e1", "skipped"]]);
    expect(t.getEmail).not.toHaveBeenCalled();
    expect(t.sent).toHaveLength(0);
  });

  it("skips what happened before the member ticked it", async () => {
    const t = setup([event({ created_at: ago(30), kind_enabled_at: ago(10) })]);
    await t.run();
    expect(t.finished).toEqual([["e1", "skipped"]]);
  });

  it("skips a notification older than 24 hours", async () => {
    const t = setup([event({ created_at: ago(25 * 60), kind_enabled_at: ago(48 * 60) })]);
    await t.run();
    expect(t.finished).toEqual([["e1", "skipped"]]);
  });

  it("throttles message emails to one per hour per conversation, but not other kinds", async () => {
    const recent = ago(30);
    const t = setup([
      event({ id: "m1", last_sent_at: recent }),
      event({ id: "m2", last_sent_at: ago(61) }),
      event({ id: "p1", kind: "post", on_posts: true, last_sent_at: recent }),
    ]);
    await t.run();
    expect(t.finished).toEqual([["m1", "skipped"], ["m2", "sent"], ["p1", "sent"]]);
  });

  it("skips when the member has no address any more", async () => {
    const t = setup([event()], { email: null });
    await t.run();
    expect(t.finished).toEqual([["e1", "skipped"]]);
  });

  it("asks for another try when the lookup or the send fails, and carries on with the others", async () => {
    const lookup = setup([event(), event({ id: "e2" })], { email: "throw" });
    expect(await lookup.run()).toMatchObject({ retried: 2 });
    expect(lookup.finished).toEqual([["e1", "retry"], ["e2", "retry"]]);
    const send = setup([event()], { sendError: true });
    expect(await send.run()).toMatchObject({ retried: 1 });
    expect(send.finished).toEqual([["e1", "retry"]]);
  });

  it("never writes an email address or message text into the log when something fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await setup([event()], { sendError: true }).run();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/bo@x\.test|hello|Ann A/);
    log.mockRestore();
  });

  it("does nothing when nothing is waiting", async () => {
    const t = setup([]);
    expect(await t.run()).toEqual({ sent: 0, skipped: 0, retried: 0 });
  });
});
