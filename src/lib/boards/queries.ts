import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BoardPostRow, BoardSummary } from "./types";

export const BOARD_PAGE_SIZE = 20;

// The signed-in member's id, or a redirect to sign-in that comes back to `next`.
export async function requireViewer(next: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) redirect(`/login?next=${encodeURIComponent(next)}`);
  return sub;
}

export async function getBoards(): Promise<BoardSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_boards");
  if (error) throw new Error("boards unavailable");
  return (data ?? []) as BoardSummary[];
}

export async function getBoardPosts(slug: string, before: string | null): Promise<BoardPostRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("board_posts_page", { p_slug: slug, p_before: before, p_limit: BOARD_PAGE_SIZE });
  if (error) throw new Error("posts unavailable");
  return (data ?? []) as BoardPostRow[];
}

export async function getBoardPost(id: string): Promise<BoardPostRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("board_post", { p_id: id });
  if (error) throw new Error("post unavailable");
  const rows = (data ?? []) as BoardPostRow[];
  return rows[0] ?? null;
}
