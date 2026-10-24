import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { DirectoryForm } from "./directory-form";
import { NotificationsForm } from "./notifications-form";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">{copy.settings.title}</h1>
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
  const prefs = (prefsRows?.[0] ?? { connection_requests: true, connection_accepted: true, messages: true }) as {
    connection_requests: boolean; connection_accepted: boolean; messages: boolean;
  };

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{copy.settings.privacy}</h2>
        <DirectoryForm showInDirectory={profile.show_in_directory} />
      </section>
      <section id="notifications" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{copy.settings.notifications}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.settings.notificationsIntro}</p>
        <NotificationsForm requests={prefs.connection_requests} accepted={prefs.connection_accepted} messages={prefs.messages} />
      </section>
    </>
  );
}
