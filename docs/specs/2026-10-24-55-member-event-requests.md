# Member event requests and more admins (#55)

Owner request (2026-10-24): members, not only admins, can add an event. A member's request
goes to the admins, who approve or reject it. Admins can make other members admins.

## Decisions (owner, 2026-10-24)

- A member requests an event **by link** (the same links "Add an event by link" accepts today).
- Admins are told **by email** and see a **pending list** with a count in the header.
- Admins are made and removed on the **Members** admin page.

## Member side

- New page `/events/submit` (linked from the Events page: "Suggest an event"), signed-in members with a complete profile only.
- Form: event link (required), a note to the admins (optional, 300 characters).
- **Read link first** (owner, 2026-10-24): like the admin's "Add an event by link", the member pastes the link, the page is read
  into details (same guarded fetch), and the member checks and edits them. If the page cannot be read or is not an event page,
  the member fills the details in by hand. Only then **Send** stores the request with those details (and the optional note).
  Reading needs a signed-in member; nothing is saved until Send.
- Refused with a plain message: an address already on the site (ours from Luma, or added before), or already waiting for approval.
- Limits: at most 3 waiting requests per member, and 10 new requests per member per day.
- The member sees their own requests on the same page with a status: Waiting, Approved (with a link to the event), Rejected.
  A waiting request can be withdrawn.

## Admin side

- `/admin/events` gets a "Requests" section at the top, shown only when something waits, and the Admin nav shows the count.
- Each request shows: who asked (name, company), the link, the note, when.
- **Review and add**: opens the existing preview/edit form with the details the member sent (no second read of the page). Pressing **Add event** there adds the
  event exactly as today and marks the request Approved (same transaction, same database function).
- **Reject**: marks it Rejected, with an optional short reason that the member sees.
- Any admin can decide; the first decision wins (a decided request cannot be decided again).

## Emails

- New email kinds: `event_request` (to every admin when a request arrives) and `event_request_approved` and `event_request_rejected` (to the member when
  decided, naming the event or the reason).
- They use the existing outbox and sender. **Admins always get request emails**: no Settings checkbox, and no Unsubscribe link in
  them (the footer says why they get it and links to Manage email settings). The result email to the member is sent the same way
  (it answers their own request). Because of this, `notification_preferences` and `unsubscribe_with_code` are not changed.
- Admin emails are one per request (at most 3 waiting per member keeps the volume small).

## Admins

- `/admin/members` rows get **Make admin** / **Remove admin** buttons (asks to confirm).
- Database function `admin_set_role(member, role)`: admins only; an admin cannot remove their own admin role; the last admin
  cannot be removed. Every change is kept in a small log table (who, whom, from, to, when).
- A member who is made an admin sees the Admin link on their next page load (the role is already read from the database).

## Database (one forward migration, explicit grants and pgTAP tests)

- Table `event_requests` (id, requester_id, url, host, note, status `pending|approved|rejected`, reject_reason, event_id,
  decided_by, created_at, decided_at). Closed table: members and admins reach it only through functions
  (`submit_event_request`, `my_event_requests`, `withdraw_event_request`, `admin_event_requests`, `admin_reject_event_request`).
- `admin_save_external_event` gets an optional `p_request_id`; when given it marks that request approved and links the event.
- `admin_set_role` and its log table `role_changes`.
- `notification_events.kind` check and `claim_notification_events` learn the two new kinds; the preference
  check is skipped for these two kinds.
- Every new function gets explicit grants (production has no default grants) and a test that checks them.

## Out of scope

Members editing events, a full by-hand event form for members, approving without admin review, deleting events as a member.

## Checks

Unit tests (form parsing, limits, actions, email text), pgTAP tests (who can read or call what, limits, first decision wins,
last admin protected, approve creates the event and marks the request), then browser QA locally with two members and an admin;
the real email delivery is checked on production after release.

## Decided

Admins always get request emails (owner, 2026-10-24). Limits 3 waiting / 10 per day are fine (owner).
