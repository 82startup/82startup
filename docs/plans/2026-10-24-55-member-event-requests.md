# Member event requests and more admins (#55) — plan

Spec: `docs/specs/2026-10-24-55-member-event-requests.md`. Tests first in every step. Order chosen so each step is checkable alone:

1. **Admins** — migration `20261024120000_admin_roles.sql` (`role_changes`, `admin_set_role`), pgTAP test, server action `setMemberRole`, Make/Remove admin buttons on `/admin/members`.
2. **Requests in the database** — migration `20261024130000_event_requests.sql` (`event_requests`, five functions, `admin_save_external_event` with `p_request_id`, count function), pgTAP test (grants, limits, first decision wins, approve creates the event).
3. **Member page** `/events/submit` — form parsing + actions (unit tests), list of own requests, withdraw, link from Events page.
4. **Admin list** — Requests section on `/admin/events` (Review and add → existing preview form, Reject with reason), count in the Admin nav and header.
5. **Emails** — kinds `event_request` / `event_request_result`, always sent, no Unsubscribe link. Done after #54 (Connect emails + HTML) is merged, then rebased, because both touch `email.ts`, `process.ts` and `claim_notification_events`.
6. Checks: unit, `npm run test:db`, lint, build, browser QA with two members and an admin; hand to the owner for "ship it".
