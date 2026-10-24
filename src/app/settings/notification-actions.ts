"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { parseNotificationForm } from "@/lib/notifications/form";
import { createClient } from "@/lib/supabase/server";

export type NotificationState = { saved?: boolean; error?: string };

// Saves the caller's own email choices (the database function only ever touches the caller's row).
export async function saveNotificationPreferences(_prev: NotificationState, formData: FormData): Promise<NotificationState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login?next=/settings");

  const ticked = parseNotificationForm(formData);
  const { error } = await supabase.rpc("set_notification_preferences", {
    p_requests: ticked.requests,
    p_accepted: ticked.accepted,
    p_messages: ticked.messages,
  });
  if (error) return { error: copy.settings.saveError };

  revalidatePath("/settings");
  return { saved: true };
}
