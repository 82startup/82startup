import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { copy } from "@/lib/copy";
import { isProfileComplete } from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/server";
import { PhotoSection } from "./photo-section";
import { ProfileForm } from "./profile-form";

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <Suspense>
        <ProfileContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProfileContent({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url, job_title, company_name, company_website, bio, linkedin_url, member_type")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login?next=/profile");

  // A member who has not filled the four required fields sees the first-time screen (the site sends them here from everywhere).
  const setup = !isProfileComplete(profile);
  const rawNext = (await searchParams).next;
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : null);
  const photo = <PhotoSection userId={userId} name={profile.name} avatarUrl={profile.avatar_url} />;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{setup ? copy.profile.setupTitle : copy.profile.title}</h1>
      {setup ? (
        <>
          <ProfileForm profile={profile} setup next={next} />
          <div className="mt-8">{photo}</div>
        </>
      ) : (
        <>
          {photo}
          <ProfileForm profile={profile} />
        </>
      )}
    </>
  );
}
