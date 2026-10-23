import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminCheck =
  | { status: "logged-out" }
  | { status: "not-admin" }
  | { status: "admin"; userId: string };

// Fails closed: anything other than an explicit `true` from the database means "not an admin".
export async function checkAdmin(supabase: Pick<SupabaseClient, "auth" | "rpc">): Promise<AdminCheck> {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { status: "logged-out" };
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  return !error && isAdmin === true ? { status: "admin", userId } : { status: "not-admin" };
}

// The caller's own session client (so the database rules apply too) and the result of the admin check.
export async function getAdmin() {
  const supabase = await createClient();
  return { supabase, check: await checkAdmin(supabase) };
}
