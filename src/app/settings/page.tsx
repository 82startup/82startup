import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { DirectoryForm } from "./directory-form";

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

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{copy.settings.privacy}</h2>
        <DirectoryForm showInDirectory={profile.show_in_directory} />
      </section>
    </>
  );
}
