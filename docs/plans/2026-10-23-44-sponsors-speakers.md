# Sponsors and speakers Implementation Plan

**Goal:** Public Sponsors and Speakers sections and admin pages to manage them.

**Spec:** `docs/specs/2026-10-23-44-sponsors-speakers.md`

**Architecture:** Tables `sponsors`, `speakers`, `site_settings` with row rules (everyone reads visible rows, admins write) and a public
bucket `site-images` that only admins can write to. Pictures are stored as paths in the bucket (never addresses) and checked by their
own bytes before upload. Cached public reads tagged `sponsors` / `speakers`; admin actions refresh those tags.

## Tasks (tests first)

1. **Database** (`supabase/tests/sponsors_speakers.test.sql`, `supabase/migrations/20261023190000_sponsors_speakers.sql`).
2. **Rules** (`src/lib/site/*`: validation, slug, image checks and paths, ordering, upload helper, fake client for tests).
3. **Admin actions** (`src/app/admin/sponsors|speakers/actions.ts` + tests).
4. **Public components and pages** (`src/components/site/*`, `/sponsors`, `/speakers`, `/speakers/[slug]`, home sections).
5. **Admin pages** (`/admin/sponsors`, `/admin/speakers`, nav, forms).
6. **Checks and QA:** lint, unit, DB, build, tsc; browser QA as admin, visitor and non-admin, 375px.
