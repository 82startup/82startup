import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { PhotoSection } from "./photo-section";
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
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url, job_title, company_name, company_website, bio, linkedin_url, member_type, show_in_directory")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login?next=/profile");

  return (
    <>
      <PhotoSection userId={userId} name={profile.name} avatarUrl={profile.avatar_url} />
      <ProfileForm profile={profile} />
    </>
  );
}
