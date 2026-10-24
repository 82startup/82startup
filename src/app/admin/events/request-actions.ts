"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";
import { triggerNotifications } from "@/lib/notifications/trigger";

export type RejectState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rejects a waiting request. Approving happens when the event is added from it (saveExternalEvent with its request id).
export async function rejectEventRequest(_prev: RejectState, formData: FormData): Promise<RejectState> {
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect("/login?next=/admin/events");
  if (check.status !== "admin") return { error: copy.externalAdmin.errors.forbidden };

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(id) || reason.length > 300) return { error: copy.admin.requests.error };

  const { error } = await supabase.rpc("admin_reject_event_request", { p_id: id, p_reason: reason });
  if (error) return { error: copy.admin.requests.error };

  revalidatePath("/admin/events");
  triggerNotifications();
  return {};
}
