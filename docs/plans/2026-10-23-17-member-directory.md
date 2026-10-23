# Member directory — implementation plan

> Tests are written first in every task. Nothing is committed or pushed until the owner says "ship it" (Task 7).

**Goal:** A login-only member directory (`/members`, `/members/[id]`) with search and a type filter, where members can
leave the directory with a switch that the database itself enforces.

**Spec:** `docs/specs/2026-10-23-17-member-directory.md` (approved).

**Architecture:** One migration: `profiles.show_in_directory`, a narrower read policy and column grant on `profiles`, a
`search_members` function that runs with the caller's rights, and the attendee list following the switch. Two server-rendered
pages read through the member's own session. Small pure helpers (search address, avatar rule, initials) are unit-tested.

## Global constraints

- Production grants nothing automatically: every new function has explicit grants and a database test proves them.
- Members read profile rows only when listed (`show_in_directory` and a non-empty name), their own, or as an admin. Members cannot read
  `role`. The login email is never selected or shown.
- Search text is matched literally: `%` and `_` typed by a user are not wildcards. Text is trimmed and cut at 80 characters.
- An avatar is shown only for `https` addresses on `googleusercontent.com`; anything else shows initials. Images use
  `referrerPolicy="no-referrer"`.
- Pages read at request time (`Suspense` + `await connection()`); logged out is sent to `/login?next=/members`.
- A malformed id, an unknown member and a hidden member all give the same not-found page.
- New text goes in `src/lib/copy.ts`, English.

## Files

| File | Responsibility |
|---|---|
| `supabase/migrations/20261023090000_member_directory.sql` | column, policy, grants, `search_members`, `event_attendees` update |
| `supabase/tests/member_directory.test.sql` | rules and function behaviour |
| `src/lib/members/search.ts` (+ test) | `parseMemberSearch`, `PAGE_SIZE` |
| `src/lib/members/avatar.ts` (+ test) | `safeAvatarUrl`, `initials` |
| `src/lib/profile/schema.ts` (+ test), `src/app/profile/*` | the directory checkbox |
| `src/components/avatar.tsx` | picture or initials |
| `src/app/members/page.tsx`, `member-card.tsx`, `[id]/page.tsx` | the pages |
| `src/components/site-header.tsx`, `src/lib/copy.ts` | Members link, text |

---

### Task 1: Database (tests first)

- [ ] **Step 1: write `supabase/tests/member_directory.test.sql`.** Setup as the superuser: members A (viewer, name `Viewer V`), B
  (`Bo Baker`, company `Bakery`, type `startup`, job `CEO`), C (`Cy Cole`, company `Cole & Co`, type `investor`), D (`Dee Hidden`,
  `show_in_directory = false`), E (empty name), F (`Pat 100% Perc`, company `a_b`), G (`Alex Admin`, role `admin`); one open event
  with registrations (`registered`, listed) for B, D and E. Assertions:
  1. visitors cannot read `profiles` and cannot run `search_members` (`42501`);
  2. as A: the profiles A can read among these seven are exactly A, B, C, F, G (D and E are not readable); D's and E's rows are not
     readable by id; B's `name` is readable; `select role from public.profiles` throws `42501`;
  3. as D: D can read their own row, and `search_members` for D does not list D;
  4. as G (admin): all seven rows are readable;
  5. `search_members(null, null, 100, 0)` as A returns 5 rows, first `Alex Admin` (offset 1: `Bo Baker`), ordered by name ignoring case;
  6. query `bo` finds `Bo Baker` (total 1); `BAKERY` finds B through the company; `%` returns only F (total 1) and `_` returns only F
     (total 1), never everyone; an empty or blank query returns all 5; a query longer than 80 characters does not error;
  7. type `investor` returns only C; type with a query combines (`startup` + `cy` returns nothing);
  8. paging: `limit 2 offset 2` returns 2 rows with `total` 5; `limit 2 offset 4` returns 1 row; `limit 0` returns no rows; a huge limit is
     clamped to 100;
  9. a member can update their own `show_in_directory` (and then disappears from `search_members` for others), and an update aimed at
     someone else's row changes nothing; `show_in_directory` defaults to true;
  10. `event_attendees(event)` as A lists B only: D (left the directory) and E (empty name) are not listed;
  11. grants: `anon` cannot execute `search_members`; `authenticated` can; `service_role` has no grant.
  Use `admin_events.test.sql` and `attendees.test.sql` as the pattern for roles and claims. Order the steps so that the update in 9 comes
  after the counts that depend on A being listed.
- [ ] **Step 2: run `supabase db reset && npm run test:db`, expect FAIL.**
- [ ] **Step 3: write the migration.**

```sql
alter table public.profiles add column show_in_directory boolean not null default true;

drop policy "members read all profiles" on public.profiles;
create policy "members read listed profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (show_in_directory and name <> '') or public.is_admin());

-- Members read the public columns only; role stays private.
revoke select on public.profiles from authenticated;
grant select (id, name, avatar_url, job_title, company_name, company_website, bio, linkedin_url, member_type,
              show_in_directory, created_at, updated_at) on public.profiles to authenticated;
grant update (show_in_directory) on public.profiles to authenticated;
```

  `search_members(p_query text, p_type public.member_type, p_limit integer, p_offset integer)`: `language sql stable`, security invoker,
  `set search_path = ''`; a CTE builds the pattern `'%' || replace(replace(replace(left(btrim(p_query), 80), '\', '\\'), '%', '\%'), '_', '\_') || '%'`
  (null when the query is blank), a second CTE selects `id, name, avatar_url, job_title, company_name, member_type` from `public.profiles`
  where `show_in_directory and name <> ''`, the type matches when given, and the pattern matches `name` or `company_name` with `ilike`; the final
  select adds `count(*) over () as total`, orders by `lower(name), id`, and applies `limit least(greatest(p_limit, 0), 100) offset greatest(p_offset, 0)`.
  `revoke all ... from public, anon, authenticated, service_role`, then `grant execute ... to authenticated`.
  `create or replace function public.event_attendees(...)` with the same signature and body plus `and p.show_in_directory and p.name <> ''`
  (existing grants stay).
- [ ] **Step 4: reset and run all database tests, expect PASS.** If Postgres needs a column in the grant for the policy, add exactly that column.
- [ ] **Step 5: production-like check.** Locally `revoke execute on function public.search_members(text, public.member_type, integer, integer) from authenticated`,
  tests fail, `supabase db reset` restores.

### Task 2: Pure helpers (tests first)

- [ ] `src/lib/members/search.test.ts`: `parseMemberSearch({ q: "  Bo  ", type: "investor", page: "3" })` gives `{ q: "Bo", type: "investor", page: 3 }`;
  an array value uses the first item; `q` is cut at 80 characters; an unknown type, an array of types or no type gives `null`; page `"0"`, `"-2"`,
  `"abc"`, `"1.5"`, `""`, missing and `"99999999999"` fall back to 1 (a valid page is a whole number from 1 to 1000); `PAGE_SIZE` is 24.
- [ ] `src/lib/members/avatar.test.ts`: `safeAvatarUrl` returns the address for `https://lh3.googleusercontent.com/a/x=s96-c` and
  `https://googleusercontent.com/x`; returns `null` for `http://`, `https://evil.example.com/x.png`, `https://evil-googleusercontent.com/x`,
  `https://googleusercontent.com.evil.example/x`, `javascript:alert(1)`, `data:image/png;base64,AAAA`, `//lh3.googleusercontent.com/x`, an address with
  credentials (`https://u:p@lh3.googleusercontent.com/x`), an empty string, `null` and `undefined`. `initials("Ada Lovelace")` is `AL`, `initials("Ada")` is `A`,
  `initials("  ")` and `initials("")` are `?`, `initials("ada  b  lovelace")` is `AL` (first and last word, upper-cased), `initials("한국 창업")` is `한창`.
- [ ] Implement `search.ts` (`MEMBER_TYPES` imported from the profile schema; a small `first()` helper for `string | string[] | undefined`) and `avatar.ts`
  (parse with `new URL`, require `https:`, no username or password, host equal to or ending in `.googleusercontent.com`).
- [ ] `npx vitest run src/lib/members` passes.

### Task 3: The profile switch (tests first)

- [ ] `schema.test.ts`: `parseProfileForm` returns `show_in_directory: true` when the field is `"on"` and `false` when it is absent; the full-profile
  expectations gain the field; `submittedValues` carries `show_in_directory` (`"on"` or `""`).
- [ ] `schema.ts`: add the field to `ProfileInput`, the parser and `SUBMITTED_KEYS`. `profile/page.tsx`: select `show_in_directory` too and pass it on.
  `profile-form.tsx`: a checkbox `show_in_directory` (value `on`, `defaultChecked` from the saved value or the refilled form), label and a hint from `copy`.
- [ ] `npm test` passes; the existing profile actions test (if any) still passes.

### Task 4: The pages

- [ ] `copy.ts`: a `members` block (title, search placeholder, labels, "All types", Search, Clear, Previous, Next, empty messages, edit link, LinkedIn,
  company website, directory switch text) and `nav.members`.
- [ ] `src/components/avatar.tsx`: a server component; `<img>` with `referrerPolicy="no-referrer"`, `alt=""`, fixed size, only for `safeAvatarUrl`, else a circle with initials.
- [ ] `members/page.tsx`: `Suspense` + `connection()`; session via `createClient()` and `getClaims()`; logged out `redirect("/login?next=/members")`; read
  the address with `parseMemberSearch`; `supabase.rpc("search_members", { p_query, p_type, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE })`; a GET form
  with the search box, the type dropdown and **Search** / **Clear**; cards (`member-card.tsx`) linking to `/members/[id]`; **Previous** / **Next** links that keep
  `q` and `type`; the two empty messages. A page past the end shows the empty message with a link back to page 1.
- [ ] `members/[id]/page.tsx`: validate the id as a uuid (else `notFound()`); `from("profiles").select(<public columns>).eq("id", id).maybeSingle()`; none gives
  `notFound()`; show the details from the spec; the company links to `company_website` when set; the LinkedIn link; **Edit profile** only when the id is the
  viewer's own; external links `target="_blank" rel="noopener noreferrer"`.
- [ ] Header: **Members** link only when signed in.
- [ ] `npm run lint && npm test && npm run build && npx tsc --noEmit`.

### Task 5: Browser QA (local)

- [ ] Reset local Supabase, seed 30 members (names, companies, types, one hidden, one empty-name, one with a non-Google avatar address, one with a Google-looking
  avatar), log in by magic link as a member, then with `/browse` (wait for streamed content): visitor redirected to login; the list shows 24 and **Next** shows the
  rest; search by name, by company, `%`, `_`; the type filter; Clear; a member page; the unknown and the hidden id give the same not-found page; own page shows
  **Edit profile**; switch myself out on the profile screen: I vanish from `/members` for others and from an event's attendee list (count unchanged), my own page
  still opens; the evil avatar shows initials; 375px width.
- [ ] REST as a visitor and as a member: visitor `profiles` refused; a member cannot `select=role`; a member cannot read a hidden member's row by id.

### Task 6: Final checks and handover

- [ ] `npm run lint && npm test && npm run test:db && npm run build`; no secret or real email in the diff.
- [ ] Notify the owner, report, wait for "ship it".

### Task 7: Release (after "ship it")

- [ ] Commit (spec and plan, then code), push, PR (`Closes #17`), checks, merge. The owner runs `supabase db push --linked`. Then I verify on
  production (migration list, visitor refusals, `/members` redirects when logged out, health check), the owner opens `/members` and their own page, switches
  themself out and back in, and I close the issue and remove the worktree.

## Self-review against the spec

Switch, policy and column narrowing (Task 1); search with literal wildcards, paging and total (Task 1); attendee list follows the switch (Task 1);
avatar rule (Task 2); profile checkbox (Task 3); `/members`, `/members/[id]`, header link (Task 4); testing list (Tasks 1-3, 5); release (Task 7).
