"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { cleanBody, cleanTitle, MAX_IMAGES } from "@/lib/boards/form";
import { isOwnBoardImagePath } from "@/lib/boards/images";
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
