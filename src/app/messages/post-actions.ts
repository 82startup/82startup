"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { parsePostForm } from "@/lib/posts/form";
import { createClient } from "@/lib/supabase/server";

// sentAt changes after every successful post, so the form can clear its box; sentTo is how many people got it.
export type PostState = { error?: string; sentTo?: number; sentAt?: number };

// The database checks the session, the connections, the length and the 5-per-day limit again, and delivers the post in one step.
export async function createPost(_prev: PostState, formData: FormData): Promise<PostState> {
  const body = parsePostForm(formData);
  if (!body) return { error: copy.posts.errors.invalid };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/login?next=/messages");

  const { data, error } = await supabase.rpc("create_post", { p_body: body });
  if (error) {
    if (error.code === "P0002") return { error: copy.posts.errors.noConnections };
    if (error.code === "P0001") return { error: copy.posts.errors.limit };
    if (error.code === "22001" || error.code === "22023") return { error: copy.posts.errors.invalid };
    return { error: copy.posts.errors.save };
  }
  revalidatePath("/messages");
  const sentTo = Array.isArray(data) ? Number(data[0]?.recipient_count ?? 0) : 0;
  return { sentTo, sentAt: Date.now() };
}
