# CAPTCHA on the email sign-in form (#64)

Owner request (2026-10-24): add a CAPTCHA to sign-up for security.

## Decisions (owner, 2026-10-24)

- Where: the **email sign-in form** on `/login` ("Email me a sign-in link"). It is the one place where our server sends an email
  to an address typed by a stranger (mail bombing, fake accounts). Google sign-in is protected by Google and is not changed.
  The "Sign up" bar at the bottom of the site goes straight to Substack, never through our server, so it is not covered here.
- Service: **Cloudflare Turnstile** (free, usually passes without a puzzle, supported by Supabase Auth).

## How it works

- The login page shows the Turnstile check inside the email form (loaded from `challenges.cloudflare.com`). The check adds a
  one-time token to the form.
- The sign-in action sends the token to Supabase with the email (`signInWithOtp` option `captchaToken`). **Supabase Auth verifies
  it with Cloudflare** (using the secret key stored in Supabase) and refuses to send the email when the check fails. The check is
  enforced by Supabase, not only by our page, so skipping our form does not skip the check.
- If the token is missing or refused, the person is sent back to `/login` with a plain message ("Please complete the check and
  try again"). Every attempt reloads the page, so a fresh token is always issued.

## Keys and secrets

| Key | Where | Secret? |
|---|---|---|
| Site key | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel (Production + Preview); inlined at build time | No (public by design) |
| Secret key | Supabase dashboard → Authentication → Bot and Abuse Protection (production project) | **Yes. Never in code, chat or commits** |

- If the site key is not set (local development, tests), the login page shows no check and sends no token, so everything
  keeps working as today. Locally Supabase has CAPTCHA off.

## Rollout order (so sign-in never breaks)

1. I merge the code. With no CAPTCHA enforced yet, Supabase ignores the token, so sign-in keeps working.
2. Owner creates the Turnstile widget in Cloudflare (domain `82startup.vercel.app`; add the real domain later) and sets the
   site key in Vercel. A redeploy is needed because the key is inlined at build time.
3. I check that the check shows on the live login page and the email still arrives.
4. Owner turns on CAPTCHA in Supabase (provider Turnstile, secret key). From then on Supabase enforces it.
5. We try a real sign-in on production. Rollback: switch CAPTCHA off in the Supabase dashboard (instant, no deploy).

## Out of scope

Rate limits (Supabase already limits sign-in emails per hour), CAPTCHA on other forms (messages, requests: these need a login
first), the Substack bar, a custom puzzle.

## Checks

Unit tests (token passed to Supabase; missing token when the site key is set → error back to `/login`; no site key → no check),
lint, build, browser check locally with Cloudflare's public test site key (always passes) to see the widget and the token on
the form. The real Cloudflare + Supabase check can only be tried on production (steps 3 to 5).
