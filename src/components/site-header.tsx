import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b p-4">
      <Suspense fallback={<><PublicLinks /><span className="w-24" aria-hidden /></>}>
        <HeaderContent />
      </Suspense>
    </header>
  );
}

function PublicLinks() {
  return (
    <div className="flex items-center gap-6">
      <Link href="/" className="font-semibold">{copy.siteName}</Link>
      <Link href="/events">{copy.nav.events}</Link>
    </div>
  );
}

function SignOut() {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit">{copy.nav.signOut}</button>
    </form>
  );
}

async function HeaderContent() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  if (!signedIn) {
    return (
      <>
        <PublicLinks />
        <Link href="/login">{copy.nav.signIn}</Link>
      </>
    );
  }

  // A member who has not filled the four required profile fields only has the site name and Sign out.
  const { data: complete } = await supabase.rpc("profile_is_complete");
  if (complete === false) {
    return (
      <>
        <span className="font-semibold">{copy.siteName}</span>
        <SignOut />
      </>
    );
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  // Requests waiting for this member; a failed read just shows no number.
  const { data: waiting } = await supabase.rpc("pending_request_count");
  const pending = typeof waiting === "number" ? waiting : 0;
  const { data: unreadData } = await supabase.rpc("unread_message_count");
  const unread = typeof unreadData === "number" ? unreadData : 0;
  return (
    <>
      <PublicLinks />
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/members">{copy.nav.members}</Link>
        <Link href="/connections">{copy.nav.connections}{pending > 0 && ` (${pending})`}</Link>
        <Link href="/messages">{copy.nav.messages}{unread > 0 && ` (${unread})`}</Link>
        {isAdmin === true && <Link href="/admin/events">{copy.nav.admin}</Link>}
        <Link href="/profile">{copy.nav.profile}</Link>
        <Link href="/settings">{copy.nav.settings}</Link>
        <SignOut />
      </nav>
    </>
  );
}
