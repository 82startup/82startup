# 82 Startup platform — Design

- **Date:** 2026-10-22
- **Status:** Draft for owner approval
- **Owner:** Kiha

## Goal

A public website for the 82 Startup community (Korean founders, investors and builders, starting with 82 Startup
Week in Silicon Valley). Think Tech Week's event listing plus a LinkedIn-style member directory: anyone can see the
events; signing up unlocks more information about the people.

## Decisions (owner, 2026-10-22)

| Question | Decision |
|---|---|
| Users | Founders, investors, talent and general attendees. All matter. |
| First version | **Foundation (sign up, profiles, access levels) + events.** Investor–founder connection and jobs come later. Sign up works from day one. |
| Repository and hosting | New repository at `Project/82startup`, new GitHub repo. Vercel and Supabase are new projects under the existing Vercel team and Supabase organization (to save cost). |
| Stack | Next.js + Supabase + Vercel. |
| Sign in | Email magic link, Google and LinkedIn. |
| Member types | Sign up is the same for everyone. The type (founder / investor / talent / attendee) is chosen when filling in the profile. |
| What is public | Events are fully public. Member profiles, the member list, attendee lists and contact details need login. |
| Language | English only. UI text is kept in one place so other languages can be added later. |
| Who adds events | Events are **created in Luma** (our Luma Plus calendar). The site imports and shows them. Other organizers' Luma events are added by an admin pasting the link. Later, anyone may submit events for approval. |
| Tickets | Always bought on Luma. The site never takes payment. |
| Attendee list | Luma registrations are mirrored in by email match. Members can also mark "I'm attending" per event themselves. Attending 82 Startup Week as a whole is not a separate flag. |

## Out of scope for the first version

- Creating, editing or cancelling events from this site (done in Luma).
- Payments, ticket types and prices on this site.
- Investor–founder matching, messages, intro requests, job postings, company pages.
- Email notifications, analytics dashboards, member blocking or deletion, an admin-appointment screen.
- Secondary emails on a profile (a Luma registration under a different email is not matched; the member uses
  "I'm attending" instead).
- Live updating of external events when the organizer changes them in Luma (an admin edits them).

## Architecture

One Next.js app on Vercel. Supabase provides Postgres and Auth. Everything that talks to Luma runs on the server
only; the Luma API key lives in Vercel environment settings and never in code, chat or commits. All Luma calls go
through one adapter module so tests can replace it with fake responses.

Before writing code, read the Next.js guide in `node_modules/next/dist/docs/` (this Next.js differs from older
versions; see `AGENTS.md`).

## Data model

**`profiles`** — one row per signed-up member, tied 1:1 to the auth account and created automatically at first
sign in (database trigger).
- name, avatar, headline, company name, bio, LinkedIn URL
- `member_type`: `founder` | `investor` | `talent` | `attendee`, empty until the member chooses it
- `role`: `member` | `admin`

**`events`**
- title, description, start and end time, time zone, venue, cover image, slug
- `source`: `luma_calendar` (imported from our calendar) | `external` (added by an admin from a pasted link)
- `luma_event_id` (for imported events), `luma_url` (where "Get tickets" goes)
- `status`: `published` | `cancelled`; `hidden` (admin can hide an event without deleting it)
- `show_on_home`, `featured` (both default false)
- `luma_sync_status`, `luma_sync_error`, `luma_synced_at`

**`event_registrations`** — who attends which event. One row per event + member.
- `status`: `registered` | `cancelled`
- `source`: `luma` (confirmed by Luma) | `self` (member marked "I'm attending")

Not built now: companies, jobs, messages, intro requests.

## Access rules

Enforced in the database (row-level security), not only in the pages, and checked again by server code for writes.

| Data | Not logged in | Member | Admin |
|---|---|---|---|
| Published, non-hidden events | read | read | read and manage visibility |
| Hidden or cancelled events | no | no | read and manage |
| Attendee count | number only | number | breakdown |
| Attendee list | no | read | read |
| Member profiles | no | read | read |
| Own profile | n/a | read, edit | read, edit |
| Own "I'm attending" | n/a | create, cancel | read all |

Details:
- Event cards show only what the event itself carries (such as the host name from Luma), never a profile row.
- The attendee count is exposed through a database function or view that returns totals only; registration rows
  stay closed.
- The public total is Luma-confirmed plus self-reported. Admins see the two separately. Members who add themselves
  can inflate the number, so the split is kept for admins.
- Members cannot change `role`, `show_on_home`, `featured` or `hidden`.
- Admins are set with a migration or seed. There is no screen to appoint one.

## Events

### Import from Luma (our calendar)
- A scheduled job lists the calendar's events from the Luma API and reads each one's details. New events are
  inserted; existing ones are updated. An event that disappears from Luma or is cancelled there becomes `hidden`
  or `cancelled`; nothing is deleted.
- Admin can run "Sync now". Failures are recorded on the event and shown in the admin list.

### External events
- An admin pastes a Luma link. The server reads the page's public information (title, time, venue, image) and
  fills a form. The admin corrects it and saves. If reading fails, the form is empty and filled by hand.
- External events keep their saved values; an admin edits them if the organizer changes something.

### Public pages
- `/` — **Featured events** on top (`featured`, published, not ended, soonest first), then **Upcoming events**
  (`show_on_home`, published, not ended, soonest first) with a link to all events. Ended events leave both
  areas automatically. Featured and home display are independent.
- `/events` — upcoming and past tabs. Own and external events share one card style; external ones carry a Luma
  mark.
- `/events/[slug]` — details, **Get tickets** (opens the Luma page; works without login), **I'm attending** (login
  required) and the attendee list (login required). Server-rendered with a share preview image and title.

## Attendees

1. **From Luma.** A Luma webhook reports a registration. If the guest's email equals a member's email, the
   member's row for that event is created or updated with `source = luma` and the matching status (approved →
   `registered`; declined or cancelled → `cancelled`). Registrations under other emails are counted in the Luma
   total only.
2. **Self-reported.** A logged-in member can press **I'm attending** (creates a row with `source = self`) and press
   it again to cancel. Works on both own and external events.
3. **One row per event + member.** If a Luma confirmation arrives for a member who already marked themselves, the
   same row becomes `source = luma`. If Luma later cancels it, the row becomes `cancelled`, and the member may
   press **I'm attending** again.
4. A periodic job lists each upcoming event's guests from Luma and fills in anything the webhook missed.
5. Webhook requests are verified with Luma's signature and processed at most once per event id.
6. A note near **Get tickets** asks members to use the same email as their account.

## Admin screens (`role = admin` only)

- `/admin/events` — list with toggles for home display, featured and hidden; "Sync now"; sync failures.
- `/admin/events/new-external` — paste a Luma link, review, save.
- `/admin/events/[id]` — display settings; edit fields of external events.
- `/admin/members` — read-only member list.

## Member screens

- `/login` — magic link, Google, LinkedIn.
- `/profile` — view and edit own profile; first visit prompts for the member type.
- `/members` and `/members/[id]` — directory with search by name and company and a filter by type (login
  required).

## Environments

| Environment | Database | Luma |
|---|---|---|
| Local | Local Supabase, one per thread | fake adapter; live only when testing against the test calendar |
| Preview | Preview Supabase project | test calendar |
| Production | Production Supabase project | production calendar |

Database changes only through timestamped migration files. Secrets live in Vercel and Supabase settings and the
firm's password manager. Rollback: Vercel instant rollback; database forward-fix migration.

## Testing

Tests are written first.
- **Unit:** Luma adapter (import, webhook parsing, reading a pasted link) against fake responses. Webhook tests
  cover a bad signature, a repeated event, and an email that matches no member.
- **Database and access rules** on local Supabase: logged-out users cannot read profiles, attendee lists or
  registration rows; members cannot edit others' rows or admin-only fields; only admins can change display
  settings.
- **Live Luma check** on the test calendar and event (`https://luma.com/sell0ikl`): import and webhook each work
  once. Not part of the automated suite.
- **Browser QA:** login flows, home ordering, event page, Get tickets, I'm attending, mobile layout.

## Phases

Each phase is its own issue, branch and worktree, and is released only after the owner says "ship it".

0. Setup — GitHub repo, Vercel and Supabase projects (local, preview, production), this project's `CLAUDE.md`,
   secrets.
1. Auth and profiles — three sign-in methods, `profiles`, access rules, profile screen.
2. Events — import from Luma, external links, `/events`, event page, home page.
3. Admin — visibility toggles, sync controls and failures.
4. Attendees — webhook, `event_registrations`, I'm attending, attendee list.
5. Member directory — `/members`, `/members/[id]`.

## To confirm against the Luma API reference before building

The Luma OpenAPI spec (`https://public-api.luma.com/openapi.json`) was only partly read.
- Exact import endpoints (`calendars/events/list`, `events/get`), their fields, paging and rate limits.
- Webhook event types, payload shape and the signature method (`/v2/webhooks/create`).
- Whether guest records carry the email and the approval status needed to map to `registered` / `cancelled`.
- Whether a pasted Luma page exposes the public information needed for external events.
- Paid tickets: Luma and its Stripe account handle payment; this site only links to the event page.

## Later

Anyone submits events for approval (Luma also has calendar submissions and approvals); investor–founder
connection; jobs; company pages; secondary emails; automatic refresh of external events.
