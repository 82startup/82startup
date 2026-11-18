"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { cleanBody, cleanTitle, MAX_IMAGES } from "@/lib/boards/form";
import { BOARD_IMAGE_BUCKET, isBoardImagePath, isOwnBoardImagePath } from "@/lib/boards/images";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreatePostResult = { error?: string; postId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The browser has already uploaded the images to <own id>/<post id>/<n>.jpg. The database checks the session, the board, the
// lengths, the image paths and the daily limit again, so nothing here is trusted on its own.
export async function createBoardPost(formData: FormData): Promise<CreatePostResult> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const title = cleanTitle(String(formData.get("title") ?? ""));
  const body = cleanBody(String(formData.get("body") ?? ""));
  const images = formData.getAll("image").map(String);
  if (!SLUG.test(slug) || !UUID.test(postId)) return { error: copy.boards.errors.save };
  if (!title) return { error: copy.boards.errors.title };
  if (!body) return { error: copy.boards.errors.body };
  if (images.length > MAX_IMAGES) return { error: copy.boards.errors.tooManyImages };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect(`/login?next=${encodeURIComponent(`/boards/${slug}/new`)}`);
  if (!images.every((path) => isOwnBoardImagePath(path, userId, postId))) return { error: copy.boards.errors.save };

  const { error } = await supabase.rpc("create_board_post", { p_id: postId, p_slug: slug, p_title: title, p_body: body, p_images: images });
  if (error) {
    if (error.code === "P0001") return { error: copy.boards.errors.limit };
    if (error.code === "P0002") return { error: copy.boards.errors.notFound };
    if (error.code === "22023" || error.code === "22001") return { error: copy.boards.errors.save };
    return { error: copy.boards.errors.save };
  }
  revalidatePath(`/boards/${slug}`);
  return { postId };
}

// Only the author may change a post (the database checks). The browser has uploaded any new pictures first; `image` is the final
// ordered list (kept paths plus new ones). Pictures dropped from the post are removed from storage with the member's own session.
export async function updateBoardPost(formData: FormData): Promise<CreatePostResult> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const title = cleanTitle(String(formData.get("title") ?? ""));
  const body = cleanBody(String(formData.get("body") ?? ""));
  const images = formData.getAll("image").map(String);
  if (!SLUG.test(slug) || !UUID.test(postId)) return { error: copy.boards.errors.save };
  if (!title) return { error: copy.boards.errors.title };
  if (!body) return { error: copy.boards.errors.body };
  if (images.length > MAX_IMAGES) return { error: copy.boards.errors.tooManyImages };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect(`/login?next=${encodeURIComponent(`/boards/${slug}/${postId}/edit`)}`);
  if (!images.every((path) => isOwnBoardImagePath(path, userId, postId))) return { error: copy.boards.errors.save };

  const { data, error } = await supabase.rpc("update_board_post", { p_id: postId, p_title: title, p_body: body, p_images: images });
  if (error) {
    if (error.code === "P0002") return { error: copy.boards.errors.notFound };
    return { error: copy.boards.errors.save };
  }

  const removed = ((data ?? []) as string[]).filter(isBoardImagePath);
  if (removed.length > 0) {
    try {
      const { error: removeError } = await supabase.storage.from(BOARD_IMAGE_BUCKET).remove(removed);
      if (removeError) console.error("board image cleanup failed");
    } catch {
      console.error("board image cleanup failed");
    }
  }
  revalidatePath(`/boards/${slug}/${postId}`);
  revalidatePath(`/boards/${slug}`);
  return { postId };
}

export type DeletePostResult ={ error?: string };

// The database lets only the author or an admin delete, and returns the image paths. The files are then removed with the
// server-only client (an admin's own session may not delete another member's files). Failing to remove a file is logged, not fatal.
export async function deleteBoardPost(formData: FormData): Promise<DeletePostResult> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  if (!SLUG.test(slug) || !UUID.test(postId)) return { error: copy.boards.errors.delete };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect(`/login?next=${encodeURIComponent(`/boards/${slug}/${postId}`)}`);

  const { data, error } = await supabase.rpc("delete_board_post", { p_id: postId });
  if (error) return { error: copy.boards.errors.delete };

  const paths = ((data ?? []) as string[]).filter(isBoardImagePath);
  if (paths.length > 0) {
    try {
      const { error: removeError } = await createAdminClient().storage.from(BOARD_IMAGE_BUCKET).remove(paths);
      if (removeError) console.error("board image cleanup failed");
    } catch {
      console.error("board image cleanup failed");
    }
  }
  revalidatePath(`/boards/${slug}`);
  redirect(`/boards/${slug}`);
}
