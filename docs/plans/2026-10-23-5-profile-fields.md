# Profile fields — implementation plan

Spec: `docs/specs/2026-10-23-5-profile-fields.md` (approved). Issue #5. Tests are written first in every task.

## Task 1: Schema and copy (unit tests first)

**Files:** `src/lib/profile/schema.test.ts`, `src/lib/profile/schema.ts`, `src/lib/copy.ts`

- [ ] Update `schema.test.ts` to the new behaviour and watch it fail: every new type is accepted and the old ones
  (`founder`, `talent`, `attendee`) are rejected; `headline` becomes `job_title` (120 ok, 121 rejected);
  `company_website` empty becomes `null`, `http://` and `https://` accepted, `javascript:` and `ftp://` rejected,
  200 characters ok, 201 rejected; `submittedValues` carries the new keys.
- [ ] `schema.ts`: `MEMBER_TYPES = startup, investor, student, corporate, institution, other`; rename `headline`
  to `job_title`; add `company_website` (trimmed, `^https?://`, max 200, `null` when empty).
- [ ] `copy.ts`: label "What is your job title", "Company website", the six option labels, error messages.
- [ ] Run `npm test` until green.

## Task 2: Migration (database tests first)

**Files:** `supabase/tests/profiles.test.sql`, `supabase/migrations/<timestamp>_profile_fields.sql`

- [ ] Update `profiles.test.sql` and watch it fail: a member can set `job_title`, `company_website` and the new
  types; `company_website` rejects a non-http address and an over-200 value; old type `founder` is rejected;
  another member's row is still untouchable.
- [ ] Migration: new enum, convert `member_type` with the mapping (`founder`→`startup`, `investor`→`investor`,
  `talent`/`attendee`→`other`), drop the old enum; rename `headline` to `job_title`; add `company_website` with its
  check; extend the column-level `update` grant.
- [ ] Prove the mapping on real old values: apply the previous schema locally, insert one row per old type, run
  the new migration, check the converted values, then reset.
- [ ] `npm run test:db` green.

## Task 3: Profile screen

**Files:** `src/app/profile/page.tsx`, `src/app/profile/profile-form.tsx`

- [ ] Select the new columns, show the new labels and the Company website field (`type="url"`), keep typed values
  when validation or save fails.
- [ ] `npm run lint`, `npm test`, `npm run build` green.

## Task 4: Check, QA, hand over

- [ ] Browser QA on local: the dropdown has the six options; each field saves and survives a reload; an invalid
  website shows an error and keeps typed values; the first-visit prompt still shows when the type is empty.
- [ ] Push the branch, open the PR (`Closes #5`), wait for checks. Stop and wait for the owner's "ship it".
- [ ] After "ship it": merge, then apply the migration to production with `supabase db push` after the owner
  agrees, confirm the saved profile kept its values, health check, close the issue, remove the worktree.

## Order matters on release

The app code reads `job_title` and `company_website`, so the production migration must be applied right after the
merge deploy, or the profile page errors until it is. Plan: apply the migration immediately after the merge deploy
is Ready and check `/profile` straight away. A rollback of the deploy does not undo the migration; fix forward.
