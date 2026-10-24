import { buildEmail, isAlwaysSent, type NotificationKind } from "./email";
import type { MailSender } from "./sender";

export type ClaimedEvent = {
  id: string;
  recipient_id: string;
  kind: NotificationKind;
  actor_id: string;
  actor_name: string;
  actor_job_title: string;
  actor_company: string;
  preview: string | null;
  created_at: string;
  attempts: number;
  kind_enabled_at: string | null;
  on_requests: boolean;
  on_accepted: boolean;
  on_messages: boolean;
  unsubscribe_code: string;
  last_sent_at: string | null;
};

export type NotificationStore = {
  claim(limit: number): Promise<ClaimedEvent[]>;
  finish(id: string, outcome: "sent" | "skipped" | "retry"): Promise<void>;
};

export type ProcessResult = { sent: number; skipped: number; retried: number };

const MAX_AGE_MS = 24 * 60 * 60_000;
const MESSAGE_EMAIL_INTERVAL_MS = 60 * 60_000;
const BATCH = 20;

type Deps = {
  store: NotificationStore;
  sender: MailSender;
  getEmail: (memberId: string) => Promise<string | null>;
  siteUrl: string;
  now?: Date;
};

// Sends the waiting notifications that the recipient wants. The address is looked up only here, at the last moment, and is
// never stored or logged.
export async function processNotifications({ store, sender, getEmail, siteUrl, now = new Date() }: Deps): Promise<ProcessResult> {
  const result: ProcessResult = { sent: 0, skipped: 0, retried: 0 };
  const events = await store.claim(BATCH);

  for (const e of events) {
    const created = new Date(e.created_at).getTime();
    const enabledAt = e.kind_enabled_at ? new Date(e.kind_enabled_at).getTime() : null;
    const tooOld = now.getTime() - created > MAX_AGE_MS;
    // Event request emails ignore the email settings; every other kind is sent only for what the member ticked.
    const beforeTicked = !isAlwaysSent(e.kind) && (enabledAt === null || created < enabledAt);
    const throttled = e.kind === "message" && e.last_sent_at !== null && now.getTime() - new Date(e.last_sent_at).getTime() < MESSAGE_EMAIL_INTERVAL_MS;

    if (beforeTicked || tooOld || throttled) {
      await store.finish(e.id, "skipped");
      result.skipped++;
      continue;
    }

    try {
      const to = await getEmail(e.recipient_id);
      if (!to) {
        await store.finish(e.id, "skipped");
        result.skipped++;
        continue;
      }
      const mail = buildEmail({
        kind: e.kind,
        actorId: e.actor_id,
        actorName: e.actor_name,
        actorJobTitle: e.actor_job_title,
        actorCompany: e.actor_company,
        preview: e.preview ?? "",
        prefs: { connect: e.on_requests && e.on_accepted, messages: e.on_messages },
        unsubscribeCode: e.unsubscribe_code,
        siteUrl,
      });
      await sender.send({ to, ...mail });
      await store.finish(e.id, "sent");
      result.sent++;
    } catch (error) {
      // The kind of failure only: messages could carry the address or the text.
      console.error("notification not sent:", error instanceof Error ? error.name : "unknown");
      await store.finish(e.id, "retry").catch(() => {});
      result.retried++;
    }
  }
  return result;
}
