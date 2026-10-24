# CAPTCHA on the email sign-in form: plan (#64)

Spec: `docs/specs/2026-10-24-64-signin-captcha.md` (approved 2026-10-24). Tests first.

1. `src/app/login/actions.test.ts`: the sign-in action sends the token as `captchaToken`; with a site key set and no token it goes back
   to `/login?error=captcha` without calling Supabase; a Supabase `captcha_failed` error goes to `error=captcha`; with no site key
   nothing changes.
2. `src/app/login/turnstile.test.ts`: the widget renders only a container and nothing when no site key is set.
3. Implement: `src/app/login/turnstile.tsx` (client; loads the Cloudflare script once, renders the check into the form, which adds
   the `cf-turnstile-response` field), the action change, copy (`login.errors.captcha`), the form on the login page.
4. Checks: lint, unit tests, build, tsc; browser check with Cloudflare's public always-pass test site key.
