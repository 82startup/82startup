# Required profile after sign-up Implementation Plan

**Goal:** A signed-in member must fill I am, name, job title and company or where they are now before using the site.

**Spec:** `docs/specs/2026-10-23-35-required-profile.md`

**Architecture:** The profile rules (`schema.ts`) require the four fields. The proxy keeps a signed-in member with an incomplete
profile on `/profile` (checked through `profile_is_complete()`, remembered for 10 minutes in a cookie). The profile page shows a
first-time setup mode and redirects to the remembered page after saving. The header shrinks to the site name and Sign out
for an incomplete member.

## Tasks (tests first)

1. **Rules and gate logic** (`src/lib/profile/schema.ts`, `gate.ts`, tests): four required fields, `isProfileComplete`, open paths,
   redirect path, cookie.
2. **Database** (`supabase/tests/profile_complete.test.sql`, `supabase/migrations/20261023170000_profile_is_complete.sql`).
3. **Proxy** (`src/lib/supabase/proxy.ts` + test): redirect incomplete members, cookie shortcut, fail open on a failed check.
4. **Screens** (`profile/actions.ts`, `page.tsx`, `profile-form.tsx`, `site-header.tsx`, `copy.ts`): setup mode, required marks,
   safe `next`, header redraw, "Where" label.
5. **Checks and QA:** lint, unit, DB, build, tsc; browser QA with new, Google-style and finished accounts, desktop and 375px.
