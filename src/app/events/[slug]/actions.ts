"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { parseAttendForm } from "@/lib/events/attend";
import { createClient } from "@/lib/supabase/server";

export type AttendState = { error?: string };

// The database functions check the session again and refuse events that are not open.
async function callAttendance(
  fn: "set_attendance" | "set_list_visibility",
  arg: "p_attending" | "p_show",
  formData: FormData,
): Promise<AttendState> {
  const parsed = parseAttendForm(formData);
  if (!parsed) return { error: copy.attendance.errors.save };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect(`/login?next=/events/${parsed.slug}`);

  const { error } = await supabase.rpc(fn, { p_event: parsed.id, [arg]: parsed.value });
  if (error) return { error: copy.attendance.errors.save };

  updateTag(`attendance-${parsed.id}`);
  revalidatePath(`/events/${parsed.slug}`);
  return {};
}

export async function setAttending(_prev: AttendState, formData: FormData): Promise<AttendState> {
  return callAttendance("set_attendance", "p_attending", formData);
}

export async function setListVisibility(_prev: AttendState, formData: FormData): Promise<AttendState> {
  return callAttendance("set_list_visibility", "p_show", formData);
}
