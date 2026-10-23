"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { parseProfileForm, type ProfileInput } from "@/lib/profile/schema";

export type ProfileFormState = {
  errors?: Partial<Record<keyof ProfileInput | "save", string>>;
  saved?: boolean;
};

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");

  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  const { error } = await supabase.from("profiles").update(parsed.value).eq("id", userId);
  if (error) return { errors: { save: copy.profile.errors.save } };

  revalidatePath("/profile");
  return { saved: true };
}
