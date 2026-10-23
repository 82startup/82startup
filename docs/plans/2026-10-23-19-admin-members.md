# Admin member list — implementation plan

> Tests first in every task. Nothing is committed or pushed until the owner says "ship it" (Task 5).

**Goal:** A read-only `/admin/members` list for admins with search and paging, backed by an admin-only database function.

**Spec:** `docs/specs/2026-10-23-19-admin-members.md` (approved).

## Global constraints

- Production grants nothing automatically: the function has explicit grants and a test proves them.
- The function returns rows only when `is_admin()`; members and visitors get nothing. Emails never appear in logs, errors or addresses.
- Search text is trimmed, cut at 80 characters, and matched literally (`%` and `_` are not wildcards).
- Pages read at request time (`Suspense` + `await connection()`); nothing about the screen is in the static shell.
- Logged out goes to `/login?next=/admin/members`; a non-admin gets the standard not-found page.
- New text goes in `src/lib/copy.ts`, English.

## Files

| File | Responsibility |
|---|---|
| `supabase/migrations/20261023100000_admin_members.sql` | `admin_members(query, limit, offset)` |
| `supabase/tests/admin_members.test.sql` | access, values, search, paging, grants |
| `src/lib/admin/members.ts` (+ test) | `ADMIN_MEMBERS_PAGE_SIZE`, `directoryLabel`, `formatDate` |
| `src/app/admin/admin-nav.tsx` | Events / Members switch |
| `src/app/admin/members/page.tsx` | the screen |
| `src/app/admin/events/page.tsx`, `src/lib/copy.ts` | add the switch, text |

## Task 1: Database (tests first)

- [ ] `admin_members.test.sql`: members with the email marker `admtest` (an admin, a member with a name and type and a last sign-in, a member who
  left the directory, a member with no name, a member whose name has `%` and whose email has `_`), explicit `created_at` values so the order is known. Cases:
  a visitor gets `42501`; a member gets no rows; the admin gets all five for `admtest` with the right email, role, type, joined and last sign-in values;
  the `directory` value is `yes`, `no` (switched out, even if the name is empty) or `no-name`; search by name and by email, any case; `%` and `_`
  are literal; a blank query lists everyone; a long query does not error; paging (`limit 2 offset 2`, `offset 4`, `limit 0`) with the right total;
  newest joined first; the grants (`anon` no, `authenticated` yes, `service_role` no).
- [ ] Run, expect FAIL. Write the migration (security definer, `set search_path = ''`, join `public.profiles` with `auth.users`, filter `public.is_admin()`,
  literal pattern as in `search_members`, `count(*) over ()`, order by `joined_at desc, id`, limit clamped to 100, `revoke all ... from public, anon,
  authenticated, service_role`, `grant execute ... to authenticated`). Run the database tests, expect PASS. Production-like check: revoke the grant, tests
  fail, reset.

## Task 2: Helpers (tests first)

- [ ] `members.test.ts`: `directoryLabel("yes")` is `Yes`, `"no"` is `No`, `"no-name"` is `No name`, anything else is `—`; `formatDate("2026-10-23T18:30:00Z")` is
  `2026-10-23`, `formatDate(null)` is `—`, an unreadable date is `—`. Implement `members.ts` (`ADMIN_MEMBERS_PAGE_SIZE = 50`).

## Task 3: The screen

- [ ] `copy.ts`: `admin.nav` (Events, Members) and an `admin.members` block. `admin-nav.tsx`: a nav with the two links, the current one marked
  (`aria-current="page"`). `admin/events/page.tsx` renders it after the admin check.
- [ ] `admin/members/page.tsx`: guard (`getAdmin`), `parseMemberSearch` for `q` and `page`, `supabase.rpc("admin_members", ...)` with 50 per page, a GET form
  (search box, **Search**, **Clear**), the total count, one card per member (name or "—", email as plain text, role, type, directory label, joined, last sign-in
  or "never"), **Previous** / **Next**, the empty message.
- [ ] `npm run lint && npm test && npm run build && npx tsc --noEmit`.

## Task 4: Browser QA (local)

- [ ] Seed 60 members (some hidden, some without a name). As a visitor: redirect; as a member: not-found with no admin text; as an admin (role set by SQL):
  the list, total, search by name and email, a literal `%`, page 2, labels, the Events/Members switch, 375px width. REST as a visitor and member: the function is refused.

## Task 5: Final checks, handover, release

- [ ] All checks pass; notify; report; wait for "ship it". After it: commit, push, PR (`Closes #19`), checks, merge; the owner runs `supabase db push --linked`;
  I verify the migration and the refusals on production, the owner opens `/admin/members`; close the issue, remove the worktree.
