# Events from Luma — import, `/events`, event page

Issue #7. Phase 2 of `2026-10-22-82startup-platform-design.md`, cut down to the smallest slice that shows real
events on the site. Where this document and the platform design differ, this document wins for Phase 2.

## Scope

In:
- Import the events of our Luma calendar into a new `events` table, once an hour.
- `/events` (upcoming and past) and `/events/[slug]`, visible without login.
- An **Events** link in the site header.

Out (later phases): events from other organizers (a Luma calendar feature, `access=view`) and pasting a Luma link;
the home page sections; admin screens and "Sync now"; Luma webhooks; "I'm attending", attendee counts and lists.

## Decisions (owner, 2026-10-23)

- Scope is exactly the "In" list above.
- A new or changed Luma event may take up to about one hour to appear. The Vercel team is on the Pro plan, so an
  hourly cron is allowed. No webhook in this phase.
- Only the **production** calendar API key exists. It has full access to the calendar, so the Luma adapter is
  **read-only by construction** (see Luma adapter).

## Data model

New table `events`. One row per Luma event of our calendar.

| column | notes |
|---|---|
| `id` | uuid, primary key |
| `luma_event_id` | text, not null, unique (the Luma `evt-...` id) |
| `slug` | text, not null, unique; made once at insert and never changed |
| `title` | text, not null |
| `description` | text, not null, default `''`; plain text |
| `start_at`, `end_at` | timestamptz; `end_at` may be null |
| `timezone` | text, not null (IANA name from Luma) |
| `location_type` | text, e.g. `offline`, `zoom`, `meet`, `unknown` |
| `venue_name`, `venue_city`, `venue_address` | text, nullable |
| `cover_url` | text, nullable, `https://` only |
| `luma_url` | text, not null, `https://` only; where **Get tickets** goes |
| `status` | `published` \| `cancelled` |
| `hidden` | boolean, default false. Set by an admin in Phase 3. **The sync never changes it.** |
| `removed_from_luma` | boolean, default false. Set by the sync (see Sync), cleared if the event comes back |
| `show_on_home`, `featured` | boolean, default false. Unused until the home page phase |
| `luma_synced_at`, `luma_sync_status`, `luma_sync_error` | when the row was last written, `ok` \| `error`, and the error text |
| `created_at`, `updated_at` | timestamptz |

This refines the platform design: it said a vanished event "becomes `hidden` or `cancelled`". Using a separate
`removed_from_luma` flag means the sync can never undo an admin's decision to hide an event, and an event that
returns to Luma reappears by itself.

**Slug:** the title lower-cased, letters and digits only, words joined with `-`, cut to 50 characters, then `-`
and the 8 characters after `evt-` in the Luma id. A title with no ASCII letters or digits becomes `event`. Example:
`ai-founders-meetup-a1b2c3d4`.

**What is imported.** Only events with `visibility = public`. Members-only and private events are never stored. An
event that was imported and later stops being public is treated like a vanished one. If `location_visibility` is
`guests-only`, the address and venue name are not stored (the city may be).

## Access rules (database, row-level security)

- `anon` and `authenticated` may `select` rows where `status = 'published'` and `hidden = false` and
  `removed_from_luma = false`. Nothing else is readable by them.
- Nobody but the server's service role can insert, update or delete. `anon` and `authenticated` have `select`
  only, via explicit grants after `revoke all`.
- An admin read policy for hidden and cancelled events arrives with the admin phase.

## Luma adapter (`src/lib/luma/`)

- One module is the only place that talks to Luma. It uses `fetch` against `https://public-api.luma.com` with the
  header `x-luma-api-key` and exposes **read functions only**: list the calendar's events
  (`GET /v1/calendars/events/list`, following `next_cursor` until `has_more` is false) and get one event
  (`GET /v1/events/get?event_id=`). The list response has no `description` (Luma's API reference shows it only on
  the single-event response), so the sync reads each event it needs a description for with get-event.
  No function can send a request other than `GET`, and a unit test fails if one does.
- The key comes from the server environment variable `LUMA_API_KEY`. It is never `NEXT_PUBLIC_`, never logged, and
  never sent to the browser.
- A mapper turns a Luma event into our row shape: rejects non-`https` URLs, drops non-public events, applies the
  `guests-only` rule, converts times to UTC with the event's time zone kept.
- Tests use a fake adapter with fixed responses. A real response is captured once (read-only, public data only) and
  stored as a test fixture.
- On HTTP 401, 403 or 429, or a network error, the adapter throws; it never retries in a loop.

## Sync job

- `vercel.json` registers a cron that calls `GET /api/cron/luma-sync` every hour (`0 * * * *`).
- The route requires `Authorization: Bearer <CRON_SECRET>` (the value Vercel sends from the environment variable
  `CRON_SECRET`). A missing or wrong header returns 401 and does nothing. If `CRON_SECRET` or `LUMA_API_KEY` is not
  set, the route returns 500 and does nothing.
- It writes with a server-only Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (already set in Production).
- Steps, in order:
  1. List all events of the calendar from the adapter. If this fails or does not finish, stop: **write nothing and
     hide nothing**.
  2. For each public event: insert it, or update the row with the same `luma_event_id`. The description comes from
     get-event, called only for events that are new or have not ended yet; an event that already ended keeps its
     stored description (this keeps the hourly call count small). Set `removed_from_luma = false`,
     `luma_synced_at = now()`, `luma_sync_status = 'ok'`, clear `luma_sync_error`. The slug of an existing row is
     kept. `status` stays `published` in this phase: the list response has no cancel field, so a canceled event is
     expected to leave the list and is then handled as removed in step 4. The `cancelled` value is for the webhook
     phase (`event.canceled`).
  3. A failure on one event is written to that row (`luma_sync_status = 'error'`, `luma_sync_error`) if the row
     exists; the run goes on with the next event.
  4. Only after step 1 finished completely: every stored event whose `luma_event_id` was not in the listing, or is
     no longer public, gets `removed_from_luma = true`. Nothing is deleted.
- The route answers with JSON counts: `created`, `updated`, `cancelled`, `removed`, `errors`. The run is
  idempotent: running it twice in a row changes nothing the second time except `luma_synced_at`.

## Pages

All server-rendered, no login needed. Time is shown in the event's own time zone.

- `/events` — two tabs, **Upcoming** (default) and **Past**, chosen by `?tab=past` so the view is linkable.
  *Upcoming* = end time (or start time when there is no end) is now or later, soonest first. *Past* = the rest,
  most recent first. Each card: cover image, title, date and time, venue name or city (or "Online" for online
  events), linking to the event page. Empty tab: "No upcoming events." / "No past events."
- `/events/[slug]` — cover, title, date and time range, venue and address when stored, description (plain text, line
  breaks kept, never parsed as HTML), **Get tickets** (opens `luma_url` in a new tab with `rel="noopener"`; works
  without login). Page title and share preview use the event title, the first 160 characters of the description, and
  the cover image. An unknown, hidden, cancelled or removed slug shows the standard not-found page.
- The header gets an **Events** link on the left, next to the site name, so it shows when logged out too. All new
  text lives in `src/lib/copy.ts`.
- Pages read the database at request time (the same `Suspense` + `connection()` pattern as the profile page), never
  during the build: CI builds with a placeholder database address and preview deployments have no Supabase
  environment.
- How pages are cached and refreshed after a sync follows the Next.js 16 guide in `node_modules/next/dist/docs/`;
  the plan picks the mechanism. The rule: an event must not stay stale for more than about an hour after the sync.

## Environments and secrets

- Production Vercel needs two new environment variables, added by the owner in the Vercel settings, never in chat or
  commits: `LUMA_API_KEY` and `CRON_SECRET` (a long random string).
- Local and tests use the fake adapter. The one live check reads the production calendar with `GET` only, with the
  key in the git-ignored `.env.local`, and is not part of the automated suite.
- Preview deployments still have no Supabase environment, so `/events` errors there. This is known and unchanged
  from Phase 1.

## Testing

Tests are written first.
- **Unit:** mapper (fields, slug, https-only URLs, non-public dropped, `guests-only` address dropped, cancelled);
  adapter paging against fake responses; the GET-only guard; sync logic with a fake adapter and fake database
  (insert, update, cancel, remove, come back, list failure hides nothing, one bad event does not stop the run,
  admin-set `hidden` is never changed); cron route (no header, wrong header, missing env, success).
- **Database and access rules** on local Supabase: `anon` and a logged-in member can read published, visible rows
  and cannot read hidden, cancelled or removed ones; neither can insert, update or delete; `luma_event_id` and
  `slug` are unique.
- **Live Luma check (manual, read-only):** one list call against the production calendar to capture a fixture and
  confirm whether the list response includes the description and venue fields.
- **Browser QA (local, seeded data):** `/events` both tabs and empty states, event page, Get tickets link, an
  unknown slug, mobile width.

## Release

Merge to `main`, then in order: owner adds `LUMA_API_KEY` and `CRON_SECRET` in Vercel Production, redeploy, apply
the migration to production with the owner's go-ahead, trigger the first sync once by hand with the secret, check
`/events` shows the calendar's public events, then close the issue and remove the worktree. Until the two variables
exist the cron route answers 500 and the site simply shows no events.

## Open items (settled during development, not by guessing)

- Luma's rate limit and maximum page size. The adapter pages sequentially and stops on 429.
- Whether the real responses match Luma's API reference (field names and the `geo_address_json` shape: `address`,
  `city`, `full_address`, ...). Checked once with the read-only live call; the captured response becomes the test
  fixture. If a canceled event turns out to stay in the list, the mapper is adjusted in a follow-up.

Settled from the API reference: the list response has no description (see Luma adapter) and no cancel field (see
Sync job).
