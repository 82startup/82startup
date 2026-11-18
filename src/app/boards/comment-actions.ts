"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { cleanComment } from "@/lib/boards/form";
import { createClient } from "@/lib/supabase/server";

export type CommentState = { error?: string; sentAt?: number };
export type DeleteCommentResult = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function memberSession(next: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect(`/login?next=${encodeURIComponent(next)}`);
  return supabase;
}

// The database checks the session, the post, the length and the 30-an-hour limit again.
export async function createBoardComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const body = cleanComment(String(formData.get("body") ?? ""));
  if (!SLUG.test(slug) || !UUID.test(postId)) return { error: copy.boards.comments.errors.save };
  if (!body) return { error: copy.boards.comments.errors.invalid };

  const supabase = await memberSession(`/boards/${slug}/${postId}`);
  const { error } = await supabase.rpc("create_board_comment", { p_post: postId, p_body: body });
  if (error) {
    if (error.code === "P0001") return { error: copy.boards.comments.errors.limit };
    if (error.code === "22023" || error.code === "22001") return { error: copy.boards.comments.errors.invalid };
    return { error: copy.boards.comments.errors.save };
  }
  revalidatePath(`/boards/${slug}/${postId}`);
  revalidatePath(`/boards/${slug}`);
  return { sentAt: Date.now() };
}

export async function updateBoardComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const body = cleanComment(String(formData.get("body") ?? ""));
  if (!SLUG.test(slug) || !UUID.test(postId) || !UUID.test(commentId)) return { error: copy.boards.comments.errors.save };
  if (!body) return { error: copy.boards.comments.errors.invalid };

  const supabase = await memberSession(`/boards/${slug}/${postId}`);
  const { error } = await supabase.rpc("update_board_comment", { p_id: commentId, p_body: body });
  if (error) {
    if (error.code === "22023" || error.code === "22001") return { error: copy.boards.comments.errors.invalid };
    return { error: copy.boards.comments.errors.save };
  }
  revalidatePath(`/boards/${slug}/${postId}`);
  revalidatePath(`/boards/${slug}`);
  return { sentAt: Date.now() };
}

export async function deleteBoardComment(formData: FormData): Promise<DeleteCommentResult> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  if (!SLUG.test(slug) || !UUID.test(postId) || !UUID.test(commentId)) return { error: copy.boards.comments.errors.delete };

  const supabase = await memberSession(`/boards/${slug}/${postId}`);
  const { error } = await supabase.rpc("delete_board_comment", { p_id: commentId });
  if (error) return { error: copy.boards.comments.errors.delete };
  revalidatePath(`/boards/${slug}/${postId}`);
  revalidatePath(`/boards/${slug}`);
  return {};
}
