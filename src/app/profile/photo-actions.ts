"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { AVATAR_BUCKET, avatarPublicUrl, isOwnAvatarPath, pathFromAvatarUrl } from "@/lib/profile/photo";
import { createClient } from "@/lib/supabase/server";

export type PhotoState = { error?: string; saved?: boolean };

// Only the member's own session is used: the profile update and the storage delete are checked by the database rules too.
async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");
  return { supabase, userId };
}

// Deleting a file is best effort: the profile is already right, but a failure is logged so orphaned files do not go unnoticed.
async function removeFiles(supabase: Awaited<ReturnType<typeof createClient>>, paths: string[]) {
  try {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove(paths);
    if (error) console.error("avatar cleanup failed");
  } catch {
    console.error("avatar cleanup failed");
  }
}

async function currentAvatarUrl(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  return (data?.avatar_url as string | null | undefined) ?? null;
}

// Called after the browser has uploaded the small JPEG to <own id>/<random id>.jpg. Records its public address on the
// profile and deletes the member's previous uploaded photo. If recording fails, the new file is deleted again.
export async function setAvatar(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const { supabase, userId } = await session();
  const path = String(formData.get("path") ?? "");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !isOwnAvatarPath(path, userId)) return { error: copy.photo.errors.save };

  const oldPath = pathFromAvatarUrl(await currentAvatarUrl(supabase, userId), base);

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarPublicUrl(base, path) })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    await removeFiles(supabase, [path]);
    return { error: copy.photo.errors.save };
  }

  if (oldPath && oldPath !== path) await removeFiles(supabase, [oldPath]);

  revalidatePath("/profile");
  return { saved: true };
}

// Clears the address and deletes the file when it is one of ours (a Google picture has no file of ours to delete).
export async function removeAvatar(): Promise<PhotoState> {
  const { supabase, userId } = await session();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldPath = base ? pathFromAvatarUrl(await currentAvatarUrl(supabase, userId), base) : null;

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { error: copy.photo.errors.save };

  if (oldPath) await removeFiles(supabase, [oldPath]);

  revalidatePath("/profile");
  return { saved: true };
}
