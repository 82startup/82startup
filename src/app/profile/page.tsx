import { Suspense } from "react";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-semibold">{copy.profile.title}</h1>
      <Suspense>
        <ProfileContent />
      </Suspense>
    </main>
  );
}

async function ProfileContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, headline, company_name, bio, linkedin_url, member_type")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login?next=/profile");

  return <ProfileForm profile={profile} />;
}
