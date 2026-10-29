import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { requestOrigin } from "@/lib/auth/request-origin";

export async function GET(request: Request) {
  const url = requestOrigin(request);
  const requestUrl = new URL(request.url);
  url.pathname = requestUrl.pathname;
  url.search = requestUrl.search;
  const { searchParams } = url;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next") ?? "/members");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Relative locations keep the browser origin, including localhost vs 127.0.0.1.
    if (!error) return NextResponse.redirect(new URL(next, url), { status: 303 });
  }
  return NextResponse.redirect(new URL("/login?error=auth", url), { status: 303 });
}
