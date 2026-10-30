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
    return <main className="mx-auto w-full max-w-sm p-6"><TopRedirect href={next} /></main>;
  }
  return (
    <main data-modal-login={params.modal === "1" ? "" : undefined} className="mx-auto w-full max-w-sm p-6">
      {params.modal === "1" && <style>{`
        body:has(main[data-modal-login]){background:#f6f5ed!important;color:#24251f!important;font-family:'IBM Plex Sans','Noto Sans KR',Arial,sans-serif}
        body:has(main[data-modal-login])>header,body:has(main[data-modal-login])>div.sticky{display:none!important}
        main[data-modal-login]{width:100%;max-width:560px;padding:30px 36px 34px}
        main[data-modal-login] h1{margin:0 0 25px;font-size:clamp(25px,5vw,32px);line-height:1.2;font-weight:500;letter-spacing:-.04em}
        main[data-modal-login] .login-forms{gap:24px}
        main[data-modal-login] .login-email-form{gap:10px}
        main[data-modal-login] label{font-size:14px;font-weight:500}
        main[data-modal-login] input[type=email]{height:48px;border:1px solid #77796e;border-radius:0;background:#fffef8;padding:0 12px;color:#24251f;outline:0}
        main[data-modal-login] input[type=email]:focus{border-color:#24251f;box-shadow:0 0 0 2px #f0fa4b}
        main[data-modal-login] button[type=submit],main[data-modal-login] a.login-google{min-height:48px;border:1px solid #24251f;border-radius:0;background:#24251f;color:#f0fa4b;font:500 12px 'IBM Plex Sans','Noto Sans KR',Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase}
        main[data-modal-login] button[type=submit]:hover,main[data-modal-login] a.login-google:hover{background:#f0fa4b;color:#24251f}
        main[data-modal-login] a.login-google{display:flex;align-items:center;justify-content:center;gap:10px;background:transparent;color:#24251f}main[data-modal-login] a.login-google:hover{background:#fffef8;color:#24251f}
        main[data-modal-login] [role=status],main[data-modal-login] [role=alert]{border:1px solid #b5ba3f;border-radius:0;background:#f0fa4b;padding:12px;color:#24251f}
        @media(max-width:560px){main[data-modal-login]{padding:24px 22px 28px}}
      `}</style>}
      <h1 className="login-title">{copy.login.title}</h1>
      <LoginForms params={params} />
    </main>
  );
}

async function LoginForms({ params }: { params: Awaited<PageProps<"/login">["searchParams"]> }) {
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/members");
  const formTarget = params.modal === "1" ? "_top" : undefined;
  const error = typeof params.error === "string" ? params.error : null;
  const sent = params.sent === "1";
  const errorText = loginErrorText(error);

  return (
    <div className="login-forms flex flex-col gap-6">
      {sent && <p role="status" className="rounded border p-3">{copy.login.sent}</p>}
      {errorText && <p role="alert" className="rounded border border-red-400 p-3 text-red-700">{errorText}</p>}

      <form action={signInWithEmail} className="login-email-form flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="modal" value={params.modal === "1" ? "1" : ""} />
        <label htmlFor="email" className="text-sm font-medium">{copy.login.emailLabel}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="rounded border p-2" />
        <Turnstile />
        <button type="submit" className="rounded bg-black p-2 text-white">{copy.login.emailButton}</button>
      </form>

      <div className="flex flex-col gap-3">
        {formTarget ? (
          <a href={`/auth/google?next=${encodeURIComponent(next)}`} target="_top" className="login-google flex w-full items-center justify-center gap-2.5 rounded border p-2 text-center"><GoogleLogo />{copy.login.google}</a>
        ) : (
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="flex w-full items-center justify-center gap-2.5 rounded border p-2"><GoogleLogo />{copy.login.google}</button>
          </form>
        )}
      </div>
    </div>
  );
}
