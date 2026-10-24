import { createAdminClient } from "@/lib/supabase/admin";
import { processNotifications, type ClaimedEvent, type NotificationStore, type ProcessResult } from "./process";
import { createMailpitSender, createResendSender, type MailSender } from "./sender";

const FROM = "82 Startup <notifications@send.82startup" + "s.com>";

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? "https://82startup.vercel.app" : "http://localhost:3000";
}

// Production sends through Resend (needs RESEND_API_KEY); local development drops the email into the local mailbox.
// With neither, nothing is claimed or sent and the notifications simply wait.
export function chooseSender(): MailSender | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) return createResendSender({ apiKey, from: FROM });
  if (process.env.NODE_ENV !== "production") {
    return createMailpitSender({ baseUrl: process.env.MAILPIT_URL ?? "http://127.0.0.1:55324", from: FROM });
  }
  return null;
}

export async function runNotifications(): Promise<(ProcessResult & { configured: true }) | { configured: false }> {
  const sender = chooseSender();
  if (!sender) return { configured: false };

  const admin = createAdminClient();
  const store: NotificationStore = {
    async claim(limit) {
      const { data, error } = await admin.rpc("claim_notification_events", { p_limit: limit });
      if (error) throw new Error("claim failed");
      return (data ?? []) as ClaimedEvent[];
    },
    async finish(id, outcome) {
      const { error } = await admin.rpc("finish_notification_event", { p_id: id, p_outcome: outcome });
      if (error) throw new Error("finish failed");
    },
  };
  const getEmail = async (memberId: string) => {
    const { data, error } = await admin.auth.admin.getUserById(memberId);
    if (error) throw new Error("address lookup failed");
    return data.user?.email ?? null;
  };

  const result = await processNotifications({ store, sender, getEmail, siteUrl: siteUrl() });
  await admin.rpc("purge_notification_events");
  return { ...result, configured: true };
}
