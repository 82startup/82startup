import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b p-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold">{copy.siteName}</Link>
        <Link href="/events">{copy.nav.events}</Link>
      </div>
      <Suspense fallback={<span className="w-24" aria-hidden />}>
        <AuthNav />
      </Suspense>
    </header>
  );
}

async function AuthNav() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  if (!signedIn) {
    return <Link href="/login">{copy.nav.signIn}</Link>;
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");
  // Requests waiting for this member; a failed read just shows no number.
  const { data: waiting } = await supabase.rpc("pending_request_count");
  const pending = typeof waiting === "number" ? waiting : 0;
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link href="/members">{copy.nav.members}</Link>
      <Link href="/connections">{copy.nav.connections}{pending > 0 && ` (${pending})`}</Link>
      {isAdmin === true && <Link href="/admin/events">{copy.nav.admin}</Link>}
      <Link href="/profile">{copy.nav.profile}</Link>
      <form action="/auth/signout" method="post">
        <button type="submit">{copy.nav.signOut}</button>
      </form>
    </nav>
  );
}
