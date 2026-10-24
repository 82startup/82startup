"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { parseProfileForm, submittedValues, type ProfileInput, type SubmittedValues } from "@/lib/profile/schema";

export type ProfileFormState = {
  errors?: Partial<Record<keyof ProfileInput | "save", string>>;
  saved?: boolean;
  values?: SubmittedValues;
};

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");

  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: submittedValues(formData) };

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(parsed.value)
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { errors: { save: copy.profile.errors.save }, values: submittedValues(formData) };

  // First-time setup: go on to the page the member was trying to reach (never back to the setup screen).
  if (formData.get("setup") === "1") {
    // The header was drawn for an incomplete member; redraw it so the full menu shows on the next page.
    revalidatePath("/", "layout");
    const next = safeNextPath(String(formData.get("next") ?? ""));
    redirect(next === "/profile" || next.startsWith("/profile?") ? "/" : next);
  }

  revalidatePath("/profile");
  return { saved: true };
}
