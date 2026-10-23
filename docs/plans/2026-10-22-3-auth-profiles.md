# Phase 1: Auth and profiles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors can sign up and sign in (email magic link, Google; LinkedIn sign-in is deferred). Every member gets a profile row that only logged-in members can read, can edit their own profile (including choosing a member type), and cannot change their own role.

**Architecture:** Supabase Auth with `@supabase/ssr` cookies. A Next.js `proxy.ts` refreshes the session on every request. Session reads happen only behind `<Suspense>` because this project runs with `cacheComponents: true`. Access rules live in Postgres (row-level security plus column-level grants), proven by pgTAP tests; pure logic (redirect safety, form parsing, env reading) is unit-tested with Vitest.

**Tech Stack:** Next.js 16 (App Router, `cacheComponents: true`), TypeScript, Tailwind (as generated), `@supabase/supabase-js`, `@supabase/ssr`, Vitest, Supabase CLI with pgTAP.

**Spec:** `docs/specs/2026-10-22-82startup-platform-design.md` (sections: Data model → `profiles`, Access rules, Member screens `/login` and `/profile`).

## Global Constraints

- Next.js here differs from older versions: read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Known facts for this repo: the middleware file is `src/proxy.ts` exporting `proxy`; `cookies()`, `headers()`, `params` and `searchParams` are async; `cacheComponents: true` is on, so any component that reads `cookies()`, `headers()` or `searchParams` must render inside a `<Suspense>` boundary or the build fails; only literal `process.env.NEXT_PUBLIC_*` references are inlined into client code.
- English only. All user-facing text lives in `src/lib/copy.ts`.
- Database changes only through timestamped migration files (`supabase migration new <name>`). Never edit production data by hand.
- Never push to `main`; `main` changes only by merging a pull request. Work on branch `kiha/3-auth-profiles` in worktree `.worktrees/3-auth-profiles`.
- Secrets never in code, chat or commits. Environment variable names for Supabase are exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key, not the legacy anon key). No secret key is needed in this phase.
- Access rules (from the spec): not logged in → no access to profiles at all; logged-in member → read all profiles, edit own profile; nobody can change `role` through the API; `role` is set by migration or seed only.
- Member types are exactly `founder`, `investor`, `talent`, `attendee`; roles are exactly `member`, `admin`.
- Local Supabase for this project uses non-default ports (api 55321, db 55322, studio 55323, mailpit/inbucket 55324). The stack from phase 0 may already be running; do not stop any other project's containers.
- Local app URL is `http://localhost:3000` (not `127.0.0.1`), so auth cookies and redirect URLs match.

## File Structure

- `src/lib/supabase/env.ts` — reads and validates the two env vars.
- `src/lib/supabase/browser.ts` — browser client (client components).
- `src/lib/supabase/server.ts` — per-request server client (server components, actions, route handlers).
- `src/lib/supabase/proxy.ts` — `updateSession(request)` used by `src/proxy.ts`.
- `src/proxy.ts` — Next.js proxy that refreshes the session.
- `src/lib/auth/safe-next.ts` — `safeNextPath()` open-redirect guard.
- `src/lib/profile/schema.ts` — `parseProfileForm()` and member type constants.
- `src/lib/copy.ts` — all UI strings.
- `src/app/login/page.tsx`, `src/app/login/actions.ts` — sign-in screen and server actions.
- `src/app/auth/callback/route.ts` — OAuth and magic-link code exchange.
- `src/app/auth/signout/route.ts` — sign out.
- `src/app/profile/page.tsx`, `src/app/profile/profile-form.tsx`, `src/app/profile/actions.ts` — profile screen.
- `src/components/site-header.tsx` — header with Sign in / Profile / Sign out.
- `supabase/migrations/<timestamp>_profiles.sql`, `supabase/tests/profiles.test.sql` — table, trigger, access rules and their tests.
- Modify: `scripts/dev-env.sh`, `supabase/config.toml`, `src/app/layout.tsx`, `.github/workflows/ci.yml`.

---

### Task 1: Supabase client helpers, session proxy and pure helpers

**Files:**
- Create: `src/lib/supabase/env.ts`, `src/lib/supabase/env.test.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/lib/auth/safe-next.ts`, `src/lib/auth/safe-next.test.ts`
- Modify: `package.json`, `scripts/dev-env.sh`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `supabaseEnv(): { url: string; key: string }`; `createBrowserClient()` from `@/lib/supabase/browser` (`createClient()`); `createClient(): Promise<SupabaseClient>` from `@/lib/supabase/server`; `updateSession(request: NextRequest): Promise<NextResponse>`; `safeNextPath(next: string | null | undefined): string`.

- [ ] **Step 1: Install packages**

Run: `npm install @supabase/supabase-js @supabase/ssr`
Expected: both added to `dependencies`.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/auth/safe-next.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps a local path with query", () => {
    expect(safeNextPath("/events/summit?tab=people")).toBe("/events/summit?tab=people");
  });
  it("falls back to / for empty values", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });
  it("rejects paths that do not start with a slash", () => {
    expect(safeNextPath("events")).toBe("/");
  });
});
```

Create `src/lib/supabase/env.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("supabaseEnv", () => {
  it("returns url and key when both are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(supabaseEnv()).toEqual({ url: "http://127.0.0.1:55321", key: "sb_publishable_test" });
  });
  it("throws a clear error when a variable is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => supabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `npm test`
Expected: FAIL, modules `./safe-next` and `./env` not found.

- [ ] **Step 4: Write the minimal implementations**

Create `src/lib/auth/safe-next.ts`:
```ts
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  return next;
}
```

Create `src/lib/supabase/env.ts`:
```ts
export function supabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Run ./scripts/dev-env.sh locally.",
    );
  }
  return { url, key };
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `npm test`
Expected: PASS (the smoke test plus the new ones).

- [ ] **Step 6: Write the Supabase clients and the proxy**

Create `src/lib/supabase/browser.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
```

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot set cookies; the proxy refreshes the session.
        }
      },
    },
  });
}
```

Create `src/lib/supabase/proxy.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Validates the token and refreshes it when it is close to expiry. Do not use getSession() here.
  await supabase.auth.getClaims();
  return response;
}
```

Create `src/proxy.ts`:
```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 7: Switch the env script to the publishable key**

Replace the body of `scripts/dev-env.sh` after `eval "$(supabase status -o env)"` so the file reads:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

eval "$(supabase status -o env)"
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
EOF
echo "Wrote .env.local for the local Supabase stack."
```
Run: `./scripts/dev-env.sh && cut -d= -f1 .env.local`
Expected: the two variable names `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. (If the local stack is not running, start it first with `supabase start`.)

- [ ] **Step 8: Give CI placeholder env for the build**

In `.github/workflows/ci.yml`, add to the `npm run build` step:
```yaml
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:55321
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_placeholder
```
Run: `ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml"); puts "ok"'`
Expected: `ok`.

- [ ] **Step 9: Verify and commit**

Run: `npm run lint && npm test && npm run build`
Expected: all pass. (`npm run build` here reads `.env.local`.)
```bash
git add -A
git commit -m "Add Supabase clients, session proxy and safe redirect helper"
```

---

### Task 2: `profiles` table, signup trigger and access rules

**Files:**
- Create: `supabase/migrations/<timestamp>_profiles.sql` (generate the name with `supabase migration new profiles`), `supabase/tests/profiles.test.sql`

**Interfaces:**
- Produces: table `public.profiles (id, name, avatar_url, headline, company_name, bio, linkedin_url, member_type, role, created_at, updated_at)`; enums `public.member_type`, `public.member_role`; trigger `on_auth_user_created` that inserts a profile for every new `auth.users` row. Logged-in members may `select` all rows and `update` only their own row's columns `name, avatar_url, headline, company_name, bio, linkedin_url, member_type`. `anon` has no access.

- [ ] **Step 1: Write the failing database test**

Create `supabase/tests/profiles.test.sql`:
```sql
begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com', '{"full_name": "Ada Lee", "avatar_url": "https://example.com/a.png"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com', '{"name": "Bo Kim", "picture": "https://example.com/b.png"}');

-- signup trigger
select is((select count(*) from public.profiles), 2::bigint, 'a profile row is created for each new user');
select is((select name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ada Lee', 'name is taken from full_name');
select is((select avatar_url from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'https://example.com/b.png', 'avatar falls back to picture');
select is((select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'member', 'new profiles are members');
select is((select member_type from public.profiles where id = '11111111-1111-1111-1111-111111111111'), null, 'member type starts empty');

-- logged out
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'logged-out visitors cannot read profiles');

-- logged-in member A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((select count(*) from public.profiles), 2::bigint, 'a member can read every profile');

update public.profiles set name = 'Ada L.', member_type = 'founder' where id = '11111111-1111-1111-1111-111111111111';
select is((select name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ada L.', 'a member can edit their own name');

update public.profiles set name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
select is((select name from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'Bo Kim', 'a member cannot edit someone else''s profile');

select throws_ok($$update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'$$, '42501', null, 'a member cannot change their own role');
select throws_ok($$update public.profiles set linkedin_url = 'https://evil.example.com/x' where id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'linkedin_url must be a linkedin.com address');
select throws_ok($$update public.profiles set member_type = 'wizard' where id = '11111111-1111-1111-1111-111111111111'$$, '22P02', null, 'member type must be one of the four types');

select * from finish();
rollback;
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm run test:db`
Expected: FAIL, relation `public.profiles` does not exist.

- [ ] **Step 3: Write the migration**

Run: `supabase migration new profiles` and put this in the new file:
```sql
create type public.member_type as enum ('founder', 'investor', 'talent', 'attendee');
create type public.member_role as enum ('member', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 100),
  avatar_url text,
  headline text not null default '' check (char_length(headline) <= 120),
  company_name text not null default '' check (char_length(company_name) <= 100),
  bio text not null default '' check (char_length(bio) <= 1000),
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/'),
  member_type public.member_type,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create policy "members read all profiles" on public.profiles
  for select to authenticated using (true);

create policy "members update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, avatar_url, headline, company_name, bio, linkedin_url, member_type)
  on public.profiles to authenticated;
```

- [ ] **Step 4: Apply it and see the tests pass**

Run: `supabase db reset && npm run test:db`
Expected: both smoke tests and all 12 profile assertions PASS. (`supabase db reset` rebuilds the local database from the migrations; it only touches this project's local stack.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests/profiles.test.sql
git commit -m "Add profiles table, signup trigger and access rules"
```

---

### Task 3: Sign-in flows (magic link, Google, LinkedIn) and sign out

Note: LinkedIn sign-in was removed from this release (see Task 5 Step 4).

**Files:**
- Create: `src/lib/copy.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/signout/route.ts`
- Modify: `supabase/config.toml` (auth URLs)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`, `safeNextPath` from `@/lib/auth/safe-next`.
- Produces: routes `/login` (accepts `?next=`, `?sent=1`, `?error=email|send|provider|auth`), `GET /auth/callback` (exchanges `code`, redirects to a safe `next`), `POST /auth/signout`. Exports `copy` from `@/lib/copy`.

- [ ] **Step 1: Point local Supabase auth at localhost:3000**

In `supabase/config.toml` under `[auth]` set:
```toml
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
```
Leave the external providers disabled locally (Google needs real client credentials and are tested on the deployed site in Task 5). Magic links are testable locally through Mailpit at `http://127.0.0.1:55324`.

- [ ] **Step 2: Write the UI strings**

Create `src/lib/copy.ts`:
```ts
export const copy = {
  siteName: "82 Startup",
  nav: { signIn: "Sign in", profile: "Profile", signOut: "Sign out" },
  login: {
    title: "Sign in to 82 Startup",
    emailLabel: "Email",
    emailButton: "Email me a sign-in link",
    google: "Continue with Google",
    linkedin: "Continue with LinkedIn",
    sent: "Check your email for a sign-in link. Open it in this browser.",
    errors: {
      email: "Enter your email address.",
      send: "We could not send the email. Try again in a minute.",
      provider: "We could not start that sign-in. Try again.",
      auth: "That sign-in link did not work. Request a new one.",
    },
  },
  profile: {
    title: "Your profile",
    pickType: "Tell us who you are so others know how to connect with you.",
    name: "Name",
    headline: "Headline",
    company: "Company",
    bio: "About you",
    linkedin: "LinkedIn URL",
    memberType: "I am a",
    types: { founder: "Founder", investor: "Investor", talent: "Talent", attendee: "Attendee" },
    save: "Save profile",
    saved: "Profile saved.",
    errors: {
      name: "Enter your name (up to 100 characters).",
      headline: "Headline can be up to 120 characters.",
      company_name: "Company can be up to 100 characters.",
      bio: "About you can be up to 1000 characters.",
      linkedin_url: "Use a https://www.linkedin.com/... address.",
      member_type: "Pick one of the options.",
      save: "We could not save your profile. Try again.",
    },
  },
} as const;
```

- [ ] **Step 3: Write the server actions**

Create `src/app/login/actions.ts`:
```ts
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
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!email) redirect(`/login?error=email&next=${encodeURIComponent(next)}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callbackUrl(next) },
  });
  redirect(error ? `/login?error=send&next=${encodeURIComponent(next)}` : "/login?sent=1");
}

async function signInWithProvider(provider: "google" | "linkedin_oidc", formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""));
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

export async function signInWithLinkedIn(formData: FormData) {
  await signInWithProvider("linkedin_oidc", formData);
}
```

- [ ] **Step 4: Write the callback and sign-out routes**

Create `src/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

Create `src/app/auth/signout/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
```

- [ ] **Step 5: Write the login page**

Create `src/app/login/page.tsx` (the page reads `searchParams`, so its content sits behind `<Suspense>`):
```tsx
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
```

- [ ] **Step 6: Verify, check the magic link flow locally, commit**

Run: `npm run lint && npm test && npm run build`
Expected: all pass (the build proves the `<Suspense>` placement is valid).
Run `supabase start` if needed, `./scripts/dev-env.sh`, then `npm run dev`. Open `http://localhost:3000/login`, enter an email, open Mailpit at `http://127.0.0.1:55324`, click the link in the same browser. Expected: you land on `/`. Check the new user exists: `supabase db query "select id, name from public.profiles" ` or Studio at `http://127.0.0.1:55323`. Record the result in the task report.
```bash
git add -A
git commit -m "Add sign-in with email link, Google and LinkedIn"
```

---

### Task 4: Profile page, profile form and site header

**Files:**
- Create: `src/lib/profile/schema.ts`, `src/lib/profile/schema.test.ts`, `src/app/profile/page.tsx`, `src/app/profile/profile-form.tsx`, `src/app/profile/actions.ts`, `src/components/site-header.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`, `copy` from `@/lib/copy`.
- Produces: `MEMBER_TYPES`, `MemberType`, `ProfileInput`, `parseProfileForm(formData: FormData): { ok: true; value: ProfileInput } | { ok: false; errors: Partial<Record<keyof ProfileInput, string>> }` in `@/lib/profile/schema`; route `/profile` (redirects to `/login?next=/profile` when logged out); `<SiteHeader />`.

- [ ] **Step 1: Write the failing tests for form parsing**

Create `src/lib/profile/schema.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseProfileForm } from "./schema";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseProfileForm", () => {
  it("accepts a complete profile and trims text", () => {
    const result = parseProfileForm(
      form({
        name: "  Ada Lee ",
        headline: "Founder at Acme",
        company_name: "Acme",
        bio: "Hello",
        linkedin_url: "https://www.linkedin.com/in/ada",
        member_type: "founder",
      }),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Ada Lee",
        headline: "Founder at Acme",
        company_name: "Acme",
        bio: "Hello",
        linkedin_url: "https://www.linkedin.com/in/ada",
        member_type: "founder",
      },
    });
  });

  it("treats an empty LinkedIn URL and an empty member type as null", () => {
    const result = parseProfileForm(form({ name: "Ada", linkedin_url: "", member_type: "" }));
    expect(result).toMatchObject({ ok: true, value: { linkedin_url: null, member_type: null } });
  });

  it("requires a name", () => {
    const result = parseProfileForm(form({ name: "   " }));
    expect(result).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
  });

  it("rejects too-long fields", () => {
    const result = parseProfileForm(
      form({ name: "x".repeat(101), headline: "h".repeat(121), company_name: "c".repeat(101), bio: "b".repeat(1001) }),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: expect.any(String),
        headline: expect.any(String),
        company_name: expect.any(String),
        bio: expect.any(String),
      },
    });
  });

  it("rejects a LinkedIn URL that is not on linkedin.com over https", () => {
    for (const bad of ["http://www.linkedin.com/in/a", "https://evil.com/in/a", "linkedin.com/in/a"]) {
      const result = parseProfileForm(form({ name: "Ada", linkedin_url: bad }));
      expect(result).toMatchObject({ ok: false, errors: { linkedin_url: expect.any(String) } });
    }
  });

  it("rejects an unknown member type", () => {
    const result = parseProfileForm(form({ name: "Ada", member_type: "wizard" }));
    expect(result).toMatchObject({ ok: false, errors: { member_type: expect.any(String) } });
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npm test`
Expected: FAIL, module `./schema` not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/profile/schema.ts`:
```ts
import { copy } from "@/lib/copy";

export const MEMBER_TYPES = ["founder", "investor", "talent", "attendee"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export type ProfileInput = {
  name: string;
  headline: string;
  company_name: string;
  bio: string;
  linkedin_url: string | null;
  member_type: MemberType | null;
};

export type ParseResult =
  | { ok: true; value: ProfileInput }
  | { ok: false; errors: Partial<Record<keyof ProfileInput, string>> };

const LINKEDIN_URL = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function parseProfileForm(formData: FormData): ParseResult {
  const errors: Partial<Record<keyof ProfileInput, string>> = {};

  const name = text(formData, "name");
  const headline = text(formData, "headline");
  const company_name = text(formData, "company_name");
  const bio = text(formData, "bio");
  const linkedin = text(formData, "linkedin_url");
  const type = text(formData, "member_type");

  if (name.length === 0 || name.length > 100) errors.name = copy.profile.errors.name;
  if (headline.length > 120) errors.headline = copy.profile.errors.headline;
  if (company_name.length > 100) errors.company_name = copy.profile.errors.company_name;
  if (bio.length > 1000) errors.bio = copy.profile.errors.bio;
  if (linkedin && !LINKEDIN_URL.test(linkedin)) errors.linkedin_url = copy.profile.errors.linkedin_url;
  if (type && !(MEMBER_TYPES as readonly string[]).includes(type)) errors.member_type = copy.profile.errors.member_type;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      headline,
      company_name,
      bio,
      linkedin_url: linkedin || null,
      member_type: (type || null) as MemberType | null,
    },
  };
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the profile action, form and page**

Create `src/app/profile/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { parseProfileForm, type ProfileInput } from "@/lib/profile/schema";

export type ProfileFormState = {
  errors?: Partial<Record<keyof ProfileInput | "save", string>>;
  saved?: boolean;
};

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login?next=/profile");

  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  const { error } = await supabase.from("profiles").update(parsed.value).eq("id", userId);
  if (error) return { errors: { save: copy.profile.errors.save } };

  revalidatePath("/profile");
  return { saved: true };
}
```

Create `src/app/profile/profile-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { MEMBER_TYPES, type MemberType } from "@/lib/profile/schema";
import { updateProfile, type ProfileFormState } from "./actions";

type Props = {
  profile: {
    name: string;
    headline: string;
    company_name: string;
    bio: string;
    linkedin_url: string | null;
    member_type: MemberType | null;
  };
};

export function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const err = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      {profile.member_type === null && <p className="rounded border p-3">{copy.profile.pickType}</p>}
      {state.saved && <p role="status" className="rounded border p-3">{copy.profile.saved}</p>}
      {err.save && <p role="alert" className="rounded border border-red-400 p-3 text-red-700">{err.save}</p>}

      <Field label={copy.profile.memberType} error={err.member_type}>
        <select name="member_type" defaultValue={profile.member_type ?? ""} className="rounded border p-2">
          <option value="">—</option>
          {MEMBER_TYPES.map((type) => (
            <option key={type} value={type}>{copy.profile.types[type]}</option>
          ))}
        </select>
      </Field>
      <Field label={copy.profile.name} error={err.name}>
        <input name="name" defaultValue={profile.name} required maxLength={100} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.headline} error={err.headline}>
        <input name="headline" defaultValue={profile.headline} maxLength={120} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.company} error={err.company_name}>
        <input name="company_name" defaultValue={profile.company_name} maxLength={100} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.bio} error={err.bio}>
        <textarea name="bio" defaultValue={profile.bio} maxLength={1000} rows={5} className="rounded border p-2" />
      </Field>
      <Field label={copy.profile.linkedin} error={err.linkedin_url}>
        <input name="linkedin_url" type="url" defaultValue={profile.linkedin_url ?? ""} className="rounded border p-2" />
      </Field>

      <button type="submit" disabled={pending} className="rounded bg-black p-2 text-white disabled:opacity-50">
        {copy.profile.save}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {error && <span role="alert" className="font-normal text-red-700">{error}</span>}
    </label>
  );
}
```

Create `src/app/profile/page.tsx` (reads cookies, so it renders behind `<Suspense>`):
```tsx
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
```

- [ ] **Step 6: Write the header and mount it**

Create `src/components/site-header.tsx`:
```tsx
import Link from "next/link";
import { Suspense } from "react";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b p-4">
      <Link href="/" className="font-semibold">{copy.siteName}</Link>
      <Suspense fallback={<span className="w-24" aria-hidden />}>
        <AuthNav />
      </Suspense>
    </header>
  );
}

async function AuthNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  if (!signedIn) {
    return <Link href="/login">{copy.nav.signIn}</Link>;
  }
  return (
    <nav className="flex items-center gap-4">
      <Link href="/profile">{copy.nav.profile}</Link>
      <form action="/auth/signout" method="post">
        <button type="submit">{copy.nav.signOut}</button>
      </form>
    </nav>
  );
}
```

In `src/app/layout.tsx`, import `SiteHeader` and render it above `{children}` inside `<body>`:
```tsx
import { SiteHeader } from "@/components/site-header";
// ...
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
      </body>
```
Also change the metadata to `title: "82 Startup"` and `description: "Events and community for Korean founders, investors and builders."`.

- [ ] **Step 7: Verify in the browser and commit**

Run: `npm run lint && npm test && npm run build && npm run test:db`
Expected: all pass.
Then with `supabase start`, `./scripts/dev-env.sh` and `npm run dev`: sign in through the magic link (Mailpit at `http://127.0.0.1:55324`), open `/profile`, pick a member type, fill in fields, save, reload and see the values; try a bad LinkedIn URL and see the error; click Sign out; open `/profile` logged out and confirm the redirect to `/login?next=/profile`. Record what you did and saw in the task report.
```bash
git add -A
git commit -m "Add profile page, profile form and site header"
```

---

### Task 5: Cloud setup and release (owner steps; stop and ask before each)

These touch the owner's accounts and production. Do not paste any key or secret into chat or commits. Each step needs the owner's go-ahead.

**The app throws on every request when `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing, so Steps 1-3 must be done BEFORE the pull request is merged, and production must be redeployed (or the merge deploy picks it up) after the variable is set.**

Preview deployments are NOT pointed at the production Supabase project (a sign-in on a preview would create production users). The preview for this PR therefore has no Supabase env and its pages that need it will error. Do the QA locally in a browser and on production after merge, and tell the owner. A preview Supabase project is a later decision.

**Files:** none.

- [ ] **Step 1: Put the Supabase keys under the new names in Vercel (Production)**

Production environment variables `NEXT_PUBLIC_SUPABASE_URL` (unchanged) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Read the publishable key with `supabase projects api-keys --project-ref htqkxezswbduzwgycftx -o json` (the entry whose type is `publishable`) and pipe it into `vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production --scope 82-startup` without printing it. The old `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` stay for now and are removed in a later phase if unused. Production must be redeployed (or the merge deploy picks it up) after the variable is set.

- [ ] **Step 2: Apply the migration to the production database (owner approval)**

Run, after the owner agrees: `supabase link --project-ref htqkxezswbduzwgycftx` then `supabase db push`. Expected: the `profiles` migration is listed and applied. Then run the access checks from the Supabase SQL editor or `supabase db query --linked`: logged-out role cannot read `public.profiles`. Never edit production data by hand.

- [ ] **Step 3: Configure Auth URLs in Supabase (owner, dashboard)**

Authentication → URL Configuration: Site URL `https://82startup.vercel.app`; Redirect URLs add the globs `https://82startup.vercel.app/**` and `https://*-82-startup.vercel.app/**` (the callback URL carries `?next=`). Also confirm in the dashboard (Authentication → Sign In / Providers) that "Allow anonymous sign-ins" is OFF and "Confirm email" is ON.

- [ ] **Step 4: Create the Google OAuth app (owner); LinkedIn deferred**

Walk the owner through each; they enter the values in the Supabase dashboard (Authentication → Providers), never in chat.
- Google: Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web). Authorized redirect URI: `https://htqkxezswbduzwgycftx.supabase.co/auth/v1/callback`. Needs the OAuth consent screen set up. Paste client ID and secret into Supabase → Providers → Google.
- LinkedIn: deferred, not part of this release (no LinkedIn developer app yet). To add later: create the LinkedIn app, enable the LinkedIn (OIDC) provider in Supabase, and re-add the button and the `signInWithLinkedIn` action.

- [ ] **Step 5: Email delivery**

Supabase's built-in email sender is rate-limited and meant for testing. Before real users sign in with magic links, set up custom SMTP (Supabase → Project Settings → Authentication → SMTP) with a sending domain. Ask the owner which provider and sender address to use. Until then, magic-link sign-in works only for a handful of test emails.

- [ ] **Step 6: Release**

Push the branch, open the pull request, wait for `checks` to pass, then QA locally in a browser and on production after merge (not on the preview, which has no Supabase env) with the owner: sign up with each method that is configured, edit the profile, sign out. Merge only after the owner says "ship it". After merge, confirm the production deployment is Ready and `https://82startup.vercel.app/login` returns 200. Close issue #3, remove the worktree and delete the branch.

---

## Self-review against the spec

- Spec "Data model → profiles" (name, avatar, headline, company, bio, LinkedIn URL, `member_type` empty until chosen, `role`): Task 2.
- Spec access rules for profiles (logged-out none, members read all and edit own, role not changeable, admin set by migration or seed): Task 2 policies, grants and tests. No admin screen, as the spec says.
- Spec sign-in methods (magic link, Google; LinkedIn deferred), profile created at first sign-in by trigger, member type chosen when filling the profile: Tasks 2, 3, 4.
- Spec screens `/login` and `/profile`: Tasks 3 and 4. `/members` is Phase 5, events are Phase 2.
- Spec environments: local Supabase (Tasks 1–4), production (Task 5); preview Supabase project is not created yet, so preview deployments get no Supabase env until one exists.
- Known limits recorded: the magic link must be opened in the same browser that requested it (PKCE); Google is tested only on the deployed site; custom SMTP is required before real launch.
