import Link from "next/link";
import { Suspense } from "react";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b p-4">
      <Link href="/" className="font-semibold">{copy.siteName}</Link>
      <Suspense fallback={<span className="w-24" aria-hidden />}>
        <AuthNav />
      </Suspense>
    </header>
  );
}

async function AuthNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  if (!signedIn) {
    return <Link href="/login">{copy.nav.signIn}</Link>;
  }
  return (
    <nav className="flex items-center gap-4">
      <Link href="/profile">{copy.nav.profile}</Link>
      <form action="/auth/signout" method="post">
        <button type="submit">{copy.nav.signOut}</button>
      </form>
    </nav>
  );
}
