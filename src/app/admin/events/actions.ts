"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/guard";
import { parseSwitch } from "@/lib/admin/helpers";
import { copy } from "@/lib/copy";
import { MissingConfigError, runLumaSync } from "@/lib/luma/run";
import type { SyncResult } from "@/lib/luma/sync";

export type AdminActionState = { error?: string; sync?: SyncResult };

const LOGIN = "/login?next=/admin/events";

// updateTag expires the events cache at once, so the next public visit never shows an event that was just hidden.
// (The cron route cannot use it; it uses revalidateTag.)
function refresh() {
  updateTag("events");
  revalidatePath("/admin/events");
}

// Every action checks admin first. The switches then write with the caller's own session, so the database rules
// check again; they can only change these two columns.
async function updateFlag(column: "featured" | "hidden", formData: FormData): Promise<AdminActionState> {
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect(LOGIN);
  if (check.status !== "admin") return { error: copy.admin.errors.forbidden };

  const parsed = parseSwitch(formData);
  if (!parsed) return { error: copy.admin.errors.save };

  const { data, error } = await supabase
    .from("events")
    .update({ [column]: parsed.value })
    .eq("id", parsed.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: copy.admin.errors.save };

  refresh();
  return {};
}

export async function setFeatured(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return updateFlag("featured", formData);
}

export async function setHidden(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return updateFlag("hidden", formData);
}

export async function syncNow(): Promise<AdminActionState> {
  const { check } = await getAdmin();
  if (check.status === "logged-out") redirect(LOGIN);
  if (check.status !== "admin") return { error: copy.admin.errors.forbidden };

  try {
    const sync = await runLumaSync();
    refresh();
    return { sync };
  } catch (error) {
    if (error instanceof MissingConfigError) return { error: copy.admin.errors.notConfigured };
    console.error("admin sync failed:", error instanceof Error ? error.name : "unknown");
    return { error: copy.admin.errors.syncFailed };
  }
}
