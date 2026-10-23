# Member connections Implementation Plan

**Goal:** Members connect by request and acceptance, with notes, decline, cancel, disconnect and block.

**Spec:** `docs/specs/2026-10-23-28-connections.md`

**Architecture:** Two closed tables (`connections`, `member_blocks`) reached only through `security definer` functions with
explicit grants; server actions validate the form and call one function each; a connect panel on the profile, a
`/connections` page and a waiting-requests number in the header.

## Tasks (tests first)

1. **Database** (`supabase/tests/connections.test.sql`, `supabase/migrations/20261023140000_connections.sql`): tables, helpers
   (`are_connected` for chat, not callable by members), nine member functions, grants; tests for every rule, closed tables and a
   production-like grant check.
2. **Form parsing and actions** (`src/lib/connections/form.ts`, `src/app/connections/actions.ts`, tests): UUID and note checks;
   one action per function; wait and unavailable messages; no database text shown.
3. **Screens** (`connection-panel.tsx`, `action-form.tsx`, `page.tsx`, `site-header.tsx`, member profile page, `copy.ts`): panel
   per state, the four lists, the header count.
4. **Checks and QA:** lint, unit, DB, build, tsc; browser QA with three local members (request with note, accept, block,
   unblock, decline and the wait message, header count, 375px).
