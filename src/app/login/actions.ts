"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";

async function callbackUrl(next: string) {
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? "/members"));
  const modal = formData.get("modal") === "1" ? "&modal=1" : "";
  if (!email) redirect(`/login?error=email&next=${encodeURIComponent(next)}${modal}`);

  // With the Turnstile check on (a site key is set), Supabase verifies the token with Cloudflare and refuses without a good one.
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "");
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) redirect(`/login?error=captcha&next=${encodeURIComponent(next)}${modal}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callbackUrl(next), ...(captchaToken && { captchaToken }) },
  });
  if (error?.code === "captcha_failed") redirect(`/login?error=captcha&next=${encodeURIComponent(next)}${modal}`);
  redirect(error ? `/login?error=send&next=${encodeURIComponent(next)}${modal}` : `/login?sent=1&next=${encodeURIComponent(next)}${modal}`);
}

async function signInWithProvider(provider: "google", formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? "/members"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: await callbackUrl(next) },
  });
  if (error || !data.url) redirect(`/login?error=provider&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function signInWithGoogle(formData: FormData) {
  await signInWithProvider("google", formData);
}
