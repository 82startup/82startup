import { Suspense } from "react";
import { copy } from "@/lib/copy";
import { safeNextPath } from "@/lib/auth/safe-next";
import { signInWithEmail, signInWithGoogle, signInWithLinkedIn } from "./actions";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-semibold">{copy.login.title}</h1>
      <Suspense>
        <LoginForms searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginForms({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;
  const sent = params.sent === "1";
  const errorText = error && error in copy.login.errors
    ? copy.login.errors[error as keyof typeof copy.login.errors]
    : null;

  return (
    <div className="flex flex-col gap-6">
      {sent && <p role="status" className="rounded border p-3">{copy.login.sent}</p>}
      {errorText && <p role="alert" className="rounded border border-red-400 p-3 text-red-700">{errorText}</p>}

      <form action={signInWithEmail} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="text-sm font-medium">{copy.login.emailLabel}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="rounded border p-2" />
        <button type="submit" className="rounded bg-black p-2 text-white">{copy.login.emailButton}</button>
      </form>

      <div className="flex flex-col gap-3">
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="w-full rounded border p-2">{copy.login.google}</button>
        </form>
        <form action={signInWithLinkedIn}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="w-full rounded border p-2">{copy.login.linkedin}</button>
        </form>
      </div>
    </div>
  );
}
