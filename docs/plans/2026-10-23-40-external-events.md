# External events Implementation Plan

**Spec:** `docs/specs/2026-10-23-40-external-events.md`

1. **Database** (`supabase/tests/external_events.test.sql`, `supabase/migrations/20261023200000_external_events.sql`).
2. **Rules** (`src/lib/external/`: `url`, `ip`, `tz`, `parse`, `fetch`, `form`, each with tests first).
3. **Admin actions** (`src/app/admin/events/external-actions.ts` + tests) and forms (`external-forms.tsx`), admin page wiring.
4. **Public** (types, queries, sync store filter, event card and event page label, no-referrer covers).
5. **Home page** (#48): Featured events first.
6. **Checks and QA** with real pages.
