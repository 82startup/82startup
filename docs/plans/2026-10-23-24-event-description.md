# Event descriptions with photos and formatting — implementation plan

> Tests first in every task. Nothing is committed or pushed until the owner says "ship it" (Task 6).

**Goal:** Store Luma's markdown description and show it, safely, on the event page.
**Spec:** `docs/specs/2026-10-23-24-event-description.md` (approved).

## Global constraints

- The description is untrusted text: raw HTML is switched off; links are `https`, `http` or `mailto` only and open in a new tab with
  `rel="noopener noreferrer nofollow"`; pictures only over `https` from `images.lumacdn.com` or `cdn.lu.ma`, with `loading="lazy"` and
  `referrerPolicy="no-referrer"`; any other picture shows its alt text; headings shift down one level (never above `h6`).
- `description_md` is cut at 20,000 characters, and only read for events that are new or not yet ended (the same rule as `description`).
- Production grants nothing automatically: the new column is added to the public column grant and a test proves a visitor can read it and still
  cannot read the sync columns.
- Pages read at request time; the plain-text description stays for the share preview and as the fallback.

## Files

| File | Responsibility |
|---|---|
| `supabase/migrations/20261023120000_event_description_md.sql` | column and grant |
| `supabase/tests/event_description.test.sql` | column, default, grants |
| `src/lib/luma/types.ts`, `sync.ts` (+ test) | read and store `description_md` |
| `src/lib/events/markdown.ts` (+ test) | link rule, picture rule, heading shift |
| `src/components/event-description.tsx` (+ test) | the safe renderer |
| `src/lib/events/types.ts`, `queries.ts`, `src/app/events/[slug]/page.tsx` | read and show it |

## Tasks

1. **Database (tests first):** `event_description.test.sql` (default empty, visitors and members read it for a visible event, a visitor still cannot read
   `luma_sync_error`, `admin_events()` returns it, the grant holds with the production-like revoke), then the migration.
2. **Sync (tests first):** `description_md` stored from the details and cut at 20,000 characters; missing becomes empty; not sent for an ended event;
   existing tests pass. Then `types.ts` and `sync.ts`.
3. **Rules and renderer (tests first):** `markdown.test.ts` (link, picture and heading rules as in the spec) and `event-description.test.ts` (renders the
   component to HTML: paragraph, bold, list, link; raw `<script>`/`<iframe>`/`onerror` gone; `javascript:` is not a link; Luma picture keeps lazy and
   no-referrer; outside picture becomes alt text; `#` becomes `<h2>`; empty markdown shows the plain-text fallback). Add `react-markdown` 10.1.0.
4. **The page:** `PublicEvent.description_md`, the query column, the event page uses `EventDescription`; lint, tests, build, type-check.
5. **Browser QA (local):** seeded events with a rich description (headings, bold, list, link, Luma picture, outside picture, `javascript:` link, raw HTML,
   very long word, wide picture) and a plain-text one; check the DOM and 375px width.
6. **Final checks and release:** all checks, notify, report, wait for "ship it". After it: commit, push, PR (`Closes #24`), checks, merge; the owner runs
   `supabase db push --linked` and presses **Sync now**; I verify the column, the grants and the Summit 2027 page; close the issue, remove the worktree.
