import { NextResponse } from "next/server";
import { parseUnsubscribeParams } from "@/lib/notifications/form";
import { createAdminClient } from "@/lib/supabase/admin";

// The mail program's one-click Unsubscribe (RFC 8058) sends a POST here. It only turns emails off.
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseUnsubscribeParams(searchParams.get("code"), searchParams.get("kind"));
  if (!parsed) return new Response("invalid", { status: 400 });
  const { data, error } = await createAdminClient().rpc("unsubscribe_with_code", { p_code: parsed.code, p_kind: parsed.kind });
  if (error || typeof data !== "string") return new Response("invalid", { status: 400 });
  return new Response("OK", { status: 200 });
}

// Opening the link in a browser (or a mail scanner opening it) changes nothing: it goes to the confirmation page.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const target = new URL("/unsubscribe", origin);
  for (const name of ["code", "kind"]) {
    const value = searchParams.get(name);
    if (value) target.searchParams.set(name, value);
  }
  return NextResponse.redirect(target);
}
