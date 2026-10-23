# Profile events Implementation Plan

**Goal:** A member's profile lists the upcoming events they are attending.

**Spec:** `docs/specs/2026-10-23-27-profile-events.md`

**Architecture:** One `security definer` function `member_events(p_member)` applies the privacy rules in the database;
the profile page calls it and renders a small server component. No new table, no new dependency.

## Tasks (tests first)

1. **Database** (`supabase/tests/profile_events.test.sql`, `supabase/migrations/20261023130000_member_events.sql`): the function
   and its explicit grants; tests for every rule in the spec and a production-like grant check.
2. **Section** (`src/app/members/[id]/member-events.tsx` + `.test.ts`, `copy.ts`): renders titles as links with the event-time
   format; renders nothing for an empty list.
3. **Page** (`src/app/members/[id]/page.tsx`): load the list with the profile and show the section.
4. **Checks and QA:** lint, unit, DB tests, build, tsc; browser QA with two members, a past event and a switched-off event, 375px.
