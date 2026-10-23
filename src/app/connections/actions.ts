"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { parseIdForm, parseMemberForm, parseSendForm } from "@/lib/connections/form";
import { createClient } from "@/lib/supabase/server";

export type ConnectionState = { error?: string };

// The database functions check the session and every rule again; this only validates the form and words the refusal.
async function call(fn: string, args: Record<string, unknown>): Promise<ConnectionState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login?next=/connections");

  const { error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === "P0001") return { error: copy.connections.errors.wait };
    if (error.code === "P0002") return { error: copy.connections.errors.unavailable };
    return { error: copy.connections.errors.save };
  }
  revalidatePath("/connections");
  revalidatePath("/members/[id]", "page");
  return {};
}

const invalid = (): ConnectionState => ({ error: copy.connections.errors.save });

export async function sendConnectionRequest(_prev: ConnectionState, formData: FormData): Promise<ConnectionState> {
  const parsed = parseSendForm(formData);
  return parsed ? call("send_connection_request", { p_addressee: parsed.member, p_note: parsed.note }) : invalid();
}

export async function respondToRequest(_prev: ConnectionState, formData: FormData): Promise<ConnectionState> {
  const id = parseIdForm(formData);
  const value = String(formData.get("value") ?? "");
  if (!id || (value !== "true" && value !== "false")) return invalid();
  return call("respond_connection_request", { p_id: id, p_accept: value === "true" });
}

export async function cancelRequest(_prev: ConnectionState, formData: FormData): Promise<ConnectionState> {
  const id = parseIdForm(formData);
  return id ? call("cancel_connection_request", { p_id: id }) : invalid();
}

export async function disconnect(_prev: ConnectionState, formData: FormData): Promise<ConnectionState> {
  const member = parseMemberForm(formData);
  return member ? call("remove_connection", { p_member: member }) : invalid();
}

export async function blockMember(_prev: ConnectionState, formData: FormData): Promise<ConnectionState> {
  const member = parseMemberForm(formData);
  return member ? call("block_member", { p_member: member }) : invalid();
}

export async function unblockMember(_prev: ConnectionState, formData: FormData): Promise<ConnectionState> {
  const member = parseMemberForm(formData);
  return member ? call("unblock_member", { p_member: member }) : invalid();
}
