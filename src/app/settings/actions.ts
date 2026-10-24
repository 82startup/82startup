"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { parseDirectoryForm } from "@/lib/settings/form";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { saved?: boolean; error?: string };

// Only the caller's own row, only this one column (the database grants nothing more).
export async function setDirectoryVisibility(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/settings");

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ show_in_directory: parseDirectoryForm(formData) })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { error: copy.settings.saveError };

  revalidatePath("/settings");
  revalidatePath("/members", "layout");
  return { saved: true };
}
