"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";

export type RoleState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Makes a member an admin, or an admin a member. The database function checks admin again and refuses your own role.
export async function setMemberRole(_prev: RoleState, formData: FormData): Promise<RoleState> {
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect("/login?next=/admin/admins");
  if (check.status !== "admin") return { error: copy.admin.errors.forbidden };

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!UUID.test(id) || (role !== "admin" && role !== "member")) return { error: copy.admin.errors.save };

  const { error } = await supabase.rpc("admin_set_role", { p_member: id, p_role: role });
  if (error) return { error: error.code === "22023" ? copy.admin.admins.ownRole : copy.admin.errors.save };

  revalidatePath("/admin/admins");
  return {};
}
