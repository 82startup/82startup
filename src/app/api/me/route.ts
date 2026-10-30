import { NextResponse } from "next/server";
import { safeAvatarUrl } from "@/lib/members/avatar";
import { createClient } from "@/lib/supabase/server";

// The signed-in member's name and picture for the Summit header, which loads no Supabase code itself.
// Anyone not signed in (or a missing Supabase configuration) gets 401, and the header keeps its plain Community button.
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const id = claims?.claims.sub;
    if (!id) return NextResponse.json({ signedIn: false }, { status: 401, headers });
    const { data } = await supabase.from("profiles").select("name, avatar_url").eq("id", id).maybeSingle();
    return NextResponse.json({ signedIn: true, name: data?.name ?? "", avatarUrl: safeAvatarUrl(data?.avatar_url) }, { headers });
  } catch {
    return NextResponse.json({ signedIn: false }, { status: 401, headers });
  }
}
