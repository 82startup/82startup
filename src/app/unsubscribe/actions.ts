"use server";

import { parseUnsubscribeParams } from "@/lib/notifications/form";
import { createAdminClient } from "@/lib/supabase/admin";

// done: what was turned off. invalid: a bad, unknown or failed request, always the same answer so nothing is revealed.
export type UnsubscribeState = { done?: string; invalid?: boolean };

// Only ever turns emails off. The private code in the link identifies the member; there is no sign-in.
export async function confirmUnsubscribe(_prev: UnsubscribeState, formData: FormData): Promise<UnsubscribeState> {
  const parsed = parseUnsubscribeParams(String(formData.get("code") ?? ""), String(formData.get("kind") ?? ""));
  if (!parsed) return { invalid: true };
  const { data, error } = await createAdminClient().rpc("unsubscribe_with_code", { p_code: parsed.code, p_kind: parsed.kind });
  if (error || typeof data !== "string") return { invalid: true };
  return { done: data };
}
