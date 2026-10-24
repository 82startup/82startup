# Speakers simplify Implementation Plan

**Spec:** `docs/specs/2026-10-24-51-speakers-simplify.md`

1. **Database** (`supabase/tests/sponsors_speakers.test.sql`, `supabase/migrations/20261023220000_speaker_events_many.sql`).
2. **Rules** (`src/lib/site/validate.ts`, `types.ts`, `queries.ts`, `speaker-events.ts`) and the admin action.
3. **Screens**: admin speaker form with event checkboxes, public speaker page, copy.
4. **Checks and QA**, then the migration on production before the merge.
