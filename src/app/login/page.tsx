import { redirect } from "next/navigation";
import { Suspense } from "react";
import { copy, loginErrorText } from "@/lib/copy";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { signInWithEmail, signInWithGoogle } from "./actions";
import { TopRedirect } from "./top-redirect";
import { Turnstile } from "./turnstile";

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
        main[data-modal-login] a.login-google{display:flex;align-items:center;justify-content:center;background:transparent;color:#24251f}
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
          <a href={`/auth/google?next=${encodeURIComponent(next)}`} target="_top" className="login-google block w-full rounded border p-2 text-center">{copy.login.google}</a>
        ) : (
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="w-full rounded border p-2">{copy.login.google}</button>
          </form>
        )}
      </div>
    </div>
  );
}
