# Email notifications Implementation Plan

**Goal:** Members opt in to emails for connection requests, accepted connections, messages and posts, each with a footer that
shows their settings and Unsubscribe links.

**Spec:** `docs/specs/2026-10-23-38-notifications.md`

**Architecture:** An outbox table is filled in the same transaction as each action; a server job (right after the action, and every
5 minutes) claims rows, applies the member's choices, the 24 hour age limit and the one-an-hour message throttle, looks the address up
at the last moment and sends through Resend (production) or the local mailbox (development). Settings checkboxes and a public
Unsubscribe page and one-click route use a private per-member code that can only turn emails off.

## Tasks (tests first)

1. **Database** (`supabase/tests/notifications.test.sql`, `supabase/migrations/20261023180000_notifications.sql`).
2. **Email text, senders, job** (`src/lib/notifications/*` and tests).
3. **Actions and routes** (settings save, unsubscribe page/action/route, cron route, triggers after actions, gate open path, `vercel.json`).
4. **Settings checkboxes** and copy.
5. **Checks and QA:** lint, unit, DB, build, tsc; browser QA with the local mailbox.

Also in this branch (#41): the big featured event card (`src/components/event-card.tsx`, home and events pages).
