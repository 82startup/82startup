import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { DirectoryForm } from "./directory-form";
import { NotificationsForm } from "./notifications-form";

export default function SettingsPage() {
  return (
    <main className="settings-page">
      <h1>{copy.settings.title}</h1>
      <Suspense fallback={<p>{copy.settings.loading}</p>}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}

async function SettingsContent() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login?next=/settings");

  const { data: profile } = await supabase.from("profiles").select("show_in_directory").eq("id", userId).single();
  if (!profile) redirect("/login?next=/settings");

  // Everything is on unless the member unticked it (and a failed read shows the default).
  const { data: prefsRows } = await supabase.rpc("my_notification_preferences");
  const prefs = (prefsRows?.[0] ?? { connect: true, messages: true }) as {
    connect: boolean; messages: boolean;
  };

  return (
    <>
      <section className="settings-card">
        <h2>{copy.settings.privacy}</h2>
        <DirectoryForm showInDirectory={profile.show_in_directory} />
      </section>
      <section id="notifications" className="settings-card">
        <h2>{copy.settings.notifications}</h2>
        <p className="settings-intro">{copy.settings.notificationsIntro}</p>
        <NotificationsForm connect={prefs.connect} messages={prefs.messages} />
      </section>
      <section className="settings-card">
        <h2>{copy.settings.account}</h2>
        {/* Sign out lives here (not in the sidebar). A plain form POST, so it works without client code. */}
        <form action="/auth/signout" method="post" className="settings-account">
          <p className="settings-intro">{copy.settings.signOutText}</p>
          <button type="submit" className="community-action community-action-secondary">{copy.settings.signOut}</button>
        </form>
      </section>
    </>
  );
}
