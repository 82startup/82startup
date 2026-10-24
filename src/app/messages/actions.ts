"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { parseMarkReadForm, parseSendMessageForm } from "@/lib/messages/form";
import { createClient } from "@/lib/supabase/server";

// sentAt changes after every successful send, so the form can clear its box.
export type MessageState = { error?: string; sentAt?: number };

// The database checks the session, the connection, the length and the rate limit again; this validates the form and
// words the refusal.
export async function sendMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const parsed = parseSendMessageForm(formData);
  if (!parsed) return { error: copy.messages.errors.invalid };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect(`/login?next=/messages/${parsed.member}`);

  const { error } = await supabase.rpc("send_message", { p_to: parsed.member, p_body: parsed.body });
  if (error) {
    if (error.code === "P0002") return { error: copy.messages.errors.notConnected };
    if (error.code === "P0001") return { error: copy.messages.errors.tooFast };
    if (error.code === "22001" || error.code === "22023") return { error: copy.messages.errors.invalid };
    return { error: copy.messages.errors.save };
  }
  revalidatePath(`/messages/${parsed.member}`);
  revalidatePath("/messages");
  return { sentAt: Date.now() };
}

// Called when a conversation with unread messages is opened. Failing is harmless: the messages just stay unread.
export async function markConversationRead(formData: FormData): Promise<void> {
  const member = parseMarkReadForm(formData);
  if (!member) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) return;
  await supabase.rpc("mark_conversation_read", { p_with: member });
}
