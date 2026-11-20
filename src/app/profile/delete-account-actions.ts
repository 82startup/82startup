"use server";

import { redirect } from "next/navigation";
import { listFilesUnder } from "@/lib/account/storage";
import { BOARD_IMAGE_BUCKET } from "@/lib/boards/images";
import { copy } from "@/lib/copy";
import { AVATAR_BUCKET } from "@/lib/profile/photo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountState = { error?: string };

// Deletes the signed-in member's own account. Removing the auth user cascades to the profile and every row that
// references it (connections, messages, posts, board posts and comments, attendance, settings). Uploaded files are
// removed first with the server-only client; a failed file cleanup is logged and does not stop the deletion.
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");

  if (String(formData.get("confirm") ?? "").trim() !== copy.deleteAccount.confirmWord) return { error: copy.deleteAccount.errors.confirm };

  // An admin deleting themself could leave the site without an admin; they hand the role over first.
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) return { error: copy.deleteAccount.errors.failed };
  if (isAdmin) return { error: copy.deleteAccount.errors.admin };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.error("account deletion unavailable: service client not configured");
    return { error: copy.deleteAccount.errors.failed };
  }

  for (const bucket of [AVATAR_BUCKET, BOARD_IMAGE_BUCKET]) {
    try {
      const paths = await listFilesUnder(admin, bucket, userId);
      if (paths.length > 0) {
        const { error } = await admin.storage.from(bucket).remove(paths);
        if (error) console.error(`account file cleanup failed (${bucket})`);
      }
    } catch {
      console.error(`account file cleanup failed (${bucket})`);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: copy.deleteAccount.errors.failed };

  // The user no longer exists; clear this browser's session cookies.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/");
}
