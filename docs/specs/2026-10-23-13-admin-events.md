# Admin screens for events

Issue #13. Phase 3 of `2026-10-22-82startup-platform-design.md`, cut down to event management. Where this document
and the platform design differ, this document wins for Phase 3.

## Scope

In:
- One admin screen, `/admin/events`: list every event, hide or show an event, mark an event **Featured**, **Sync now**,
  and see sync failures.
- How an admin is appointed, and the database rules that let admins (and only admins) do this.

Out (later): `/admin/members` (arrives with the member directory, Phase 5), pasting external Luma links and editing
external events, a `show_on_home` toggle, attendee data.

## Decisions (owner, 2026-10-23)

- Scope is event management only.
- The home page keeps its automatic **Upcoming** list. No `show_on_home` toggle is built; the column stays unused.
  **Featured** and **Hidden** are the two switches.

## Who is an admin

- `profiles.role` already exists (`member` or `admin`). Members cannot change it (their update grant excludes it).
- A migration appoints the owner: it sets `role = 'admin'` for the account whose email is `klee@sazze.vc`. Production
  has exactly that one account today and no admin. If the account does not exist when the migration runs, nothing
  happens. There is no screen to appoint an admin.

## Database rules

- `public.is_admin()`: true when the logged-in user's profile has `role = 'admin'`. It runs as the table owner so it
  can read `profiles`, and only `authenticated` may call it.
- `events` gets two admin-only policies for the `authenticated` role: read **all** rows (hidden, removed and
  cancelled too), and update rows. The update is limited by column grants to `hidden` and `featured`; an admin cannot
  rewrite titles, times or Luma fields from the site.
- Members and visitors keep today's rule: only published, visible rows.
- Today `anon` and `authenticated` can read every column of visible rows, including the sync error text. This phase
  narrows them to the public columns (the ones `/events` and the home page already read). Admins read the full row,
  including `removed_from_luma` and the sync columns, through `public.admin_events()`, a function that returns all
  events when `is_admin()` and nothing otherwise.
- `service_role` keeps the grants it has (the sync writes with it).

## The screen

- `/admin/events` needs a login and `role = 'admin'`. Logged out: sent to `/login?next=/admin/events`. Logged in but
  not an admin: the standard not-found page (the screen's existence is not revealed).
- A header line shows when the last sync ran and a **Sync now** button. After a run it shows the counts
  (created, updated, removed, errors) or "Sync failed".
- One row per event, newest start first: title, date, small labels (**Hidden**, **Removed from Luma**,
  **Sync error** with the text), a **Featured** switch and a **Hidden** switch. Each switch is a button that saves
  immediately; there is no separate save step.
- Past events are listed too (an admin may want to hide one).
- An **Admin** link appears in the header only for admins.

## Behaviour

- Every action (feature, hide, sync) is a server action that first checks that the caller is an admin, then writes
  through the user's own session so the database rules apply a second time. Sync now is the one exception: it needs
  the Luma key and the service role, so after the admin check it runs the same sync as the cron.
- After every change the events cache is expired at once with `updateTag("events")` (Server Actions only), so the very
  next public visit already shows the change and an event that was just hidden is never shown once more. The admin list
  is revalidated too. The cron route cannot use `updateTag` and keeps `revalidateTag("events", "max")`.
- The cron route and **Sync now** share one function that reads the environment and runs the sync, so they cannot drift
  apart. The cron route keeps its current behaviour and responses.
- A hidden event disappears from `/events`, the home page and its own page. A Featured event shows in the home page's
  Featured section while it has not ended.

## Testing

Tests are written first.
- **Database:** `is_admin()` true for an admin and false for a member and for logged out; an admin reads hidden, removed
  and cancelled rows and the full row through `admin_events()`; a member and a visitor get nothing from
  `admin_events()`; an admin can update `hidden` and `featured` and cannot update `title`; a member cannot update
  anything; a visitor and a member can no longer read the sync columns; the owner migration makes only the matching
  account an admin and is harmless when there is none; `service_role` grants still hold.
- **Unit:** the shared sync runner (missing environment variable, success returns counts, failure throws), the helper
  that reads a switch from a form, and the existing cron route tests still pass.
- **Browser QA (local):** log in as an admin (set `role` by SQL on a local test user): the list, both switches and their
  effect on `/events` and `/`, Sync now with seeded data, the sync-error label; log in as a member and as a visitor to
  check they cannot reach the screen; 375px width.

## Release

Merge, then in order: the owner applies the migration to production (`supabase db push --linked`, run by the owner),
log in on production and open `/admin/events`, press **Sync now** once, try Featured on one event and see it on `/`,
then undo it. No new environment variable.
