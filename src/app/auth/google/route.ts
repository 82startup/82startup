import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { requestOrigin } from "@/lib/auth/request-origin";

export async function GET(request: Request) {
  const url = requestOrigin(request);
  url.pathname = new URL(request.url).pathname;
  url.search = new URL(request.url).search;
  const next = safeNextPath(url.searchParams.get("next") ?? "/members");
  const supabase = await createClient();
  const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL(`/login?error=provider&next=${encodeURIComponent(next)}`, url));
  }
  return NextResponse.redirect(data.url);
}
