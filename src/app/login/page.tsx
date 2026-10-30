import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { copy, loginErrorText } from "@/lib/copy";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { signInWithEmail, signInWithGoogle } from "./actions";
import { TopRedirect } from "./top-redirect";
import { Turnstile } from "./turnstile";

// Google's multicolour "G", as its sign-in branding guidelines ask for on a "Continue with Google" button.
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" className="flex-none">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return <Suspense><LoginContent searchParams={searchParams} /></Suspense>;
}

async function isSignedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return Boolean(data?.claims.sub);
  } catch {
    return false;
  }
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  // A signed-in member goes straight to the community instead of seeing the sign-in form again.
  if (await isSignedIn()) {
    const next = safeNextPath(typeof params.next === "string" ? params.next : "/members");
    if (params.modal !== "1") redirect(next);
    return <main className="login-main"><TopRedirect href={next} /></main>;
  }
  return (
    <LoginShell modal={params.modal === "1"}>
      <h1 className="login-title">{copy.login.title}</h1>
      <LoginForms params={params} />
    </LoginShell>
  );
}

// The Summit look for both entry points: inside the Summit sign-in dialog (modal=1) just the form; opened on its own,
// a yellow Summit bar and the same card the dialog shows.
function LoginShell({ modal, children }: { modal: boolean; children: React.ReactNode }) {
  if (modal) return <main className="login-main login-main-modal">{children}</main>;
  return (
    <div className="login-standalone">
      <header className="login-bar">
        <Link href="/" className="login-bar-brand"><img src="/assets/82startup-symbol.svg" alt="" width="34" height="34" /><span>82 STARTUP WEEK</span></Link>
        <Link href="/" className="login-bar-home">← Summit home</Link>
      </header>
      <div className="login-card">
        <div className="login-card-head">{copy.login.cardTitle}</div>
        <main className="login-main">{children}</main>
      </div>
    </div>
  );
}

async function LoginForms({ params }: { params: Awaited<PageProps<"/login">["searchParams"]> }) {
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/members");
  const formTarget = params.modal === "1" ? "_top" : undefined;
  const error = typeof params.error === "string" ? params.error : null;
  const sent = params.sent === "1";
  const errorText = loginErrorText(error);

  return (
    <div className="login-forms">
      {sent && <p role="status" className="login-notice">{copy.login.sent}</p>}
      {errorText && <p role="alert" className="login-notice login-notice-error">{errorText}</p>}

      <form action={signInWithEmail} className="login-email-form">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="modal" value={params.modal === "1" ? "1" : ""} />
        <label htmlFor="email">{copy.login.emailLabel}</label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        <Turnstile />
        <button type="submit" className="login-primary">{copy.login.emailButton}</button>
      </form>

      <div className="login-alt">
        {formTarget ? (
          <a href={`/auth/google?next=${encodeURIComponent(next)}`} target="_top" className="login-google"><GoogleLogo />{copy.login.google}</a>
        ) : (
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="login-google"><GoogleLogo />{copy.login.google}</button>
          </form>
        )}
      </div>
    </div>
  );
}
