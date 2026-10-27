import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Relative locations keep the browser origin, including localhost vs 127.0.0.1.
    if (!error) return new NextResponse(null, { status: 303, headers: { Location: next } });
  }
  return new NextResponse(null, { status: 303, headers: { Location: "/login?error=auth" } });
}
