# Luma webhooks — Luma changes show on the site within seconds

Issue #23. Today a change made in Luma shows on the site at the next top of the hour, when the hourly sync runs. This adds
Luma's webhooks so the affected event is refreshed within seconds. The hourly sync stays as the safety net. Replaces the
"hourly read only" decision of `2026-10-23-7-events-import.md` and `2026-10-23-15-attendees.md` for the speed of updates; their
other rules (what is imported, what is stored, no emails kept) do not change.

## Scope

In:
- A signed endpoint, `POST /api/webhooks/luma`, that Luma calls when something changes.
- Refreshing only the affected event (its details, its Luma count, its attendees), or hiding it when it is no longer public or was canceled.
- The public pages show the change on the next visit.

Out: creating the webhook from our code (the owner does it in Luma), any write to Luma, webhook delivery logs or a retry screen,
ticket, refund, subscriber and submission events (not needed).

## What triggers it

The owner subscribes the webhook to these Luma event types and no others:

| Luma type | What we do |
|---|---|
| `event.created`, `event.updated`, `calendar.event.added` | refresh that event (insert it, or update it, with description, Luma count and attendees) |
| `event.canceled` | mark that event removed from Luma (it disappears from the site; nothing is deleted) |
| `guest.registered`, `guest.updated` | refresh that event's Luma count and its attendees |

Any other type is answered "OK" and ignored. The Luma event id is `data.id` for the event types and `calendar.event.added`, and
`data.event.id` for the guest types. A body that is not JSON, has no usable event id, or whose id does not look like `evt-...`
is answered "OK" and ignored (so Luma does not retry or pause the webhook).

## Checking that the request is really from Luma

Luma documents the signature (help page "Webhooks"). The endpoint follows it exactly:
- Headers `Webhook-Id`, `Webhook-Timestamp` (Unix seconds) and `Webhook-Signature` of the form `t=<timestamp>,v1=<signature>`.
- The signed text is `<timestamp>.<raw request body>`; the signature is HMAC-SHA256 of it, in hex, with the webhook's `whsec_...` secret
  used exactly as given (no decoding, prefix kept). The comparison is constant-time.
- A request whose timestamp is more than 5 minutes old, or more than 5 minutes in the future, is rejected.
- The raw body is read before anything parses it, and a body over 1 MB is rejected.
- A request that fails any of these gets `401` and causes no change. If the secret is not configured the endpoint answers `500` and does
  nothing. The endpoint never answers `410` (Luma pauses a webhook that gets one).

## Replying fast, working after

Luma wants a reply within 5 seconds and retries up to 3 times (1, 2 and 4 minutes) after a failure. The endpoint verifies the request,
answers `200` at once, and does the refresh after the answer is sent (Next's `after`). A failure in the refresh is logged by kind only (no
email, no payload) and is picked up by the hourly sync. Receiving the same webhook twice is harmless: the refresh is idempotent.

## The refresh of one event

- It reuses the sync's per-event step (the same rules as the hourly run: only public Luma events, description from the details, the Luma
  approved count, attendees matched without storing any email, a partial or failed guest read touches no attendees, an event that has ended is
  left alone, `hidden` and `status` are never written). The hourly sync is changed to call the same step, so the two cannot drift apart.
- If the event is not public (or not ours), it is marked removed from Luma if it was stored, and nothing is stored if it was not.
- Afterwards the events cache is expired at once (`revalidateTag` with an immediate expiry), so the next visit already shows the change,
  including attendee counts.
- The Luma client stays read-only: it only ever reads (`GET`). The one new need is reading a single event's details, which it already does.

## Setup (the owner, once)

1. In Luma (calendar settings, developer area) create a webhook: URL `https://82startup.vercel.app/api/webhooks/luma`, the six event types
   above. Luma shows a secret starting with `whsec_` once.
2. Put that secret in Vercel Production as the environment variable `LUMA_WEBHOOK_SECRET` (Sensitive) and redeploy. It is never pasted in
   chat, code or commits.
3. Try it: change an event's title in Luma; the site should show it within seconds.

## Testing

Tests are written first.
- **Unit, signature:** a correct signature is accepted; a wrong secret, a changed body, a changed timestamp, a missing or malformed header, a
  signature of the wrong length, an old and a future timestamp, and extra `v1` values are handled (only a matching one passes); the secret
  with its `whsec_` prefix is used as given.
- **Unit, payload:** the event id is found for each type; unknown types, bad JSON, missing or malformed ids are ignored.
- **Unit, route:** wrong or missing signature gives `401` and does nothing; no secret gives `500` and does nothing; a valid request gives `200`
  and schedules exactly one refresh for the right event; unknown types and bad ids give `200` and schedule nothing; a body over 1 MB is rejected;
  a refresh that fails does not change the answer and logs no payload.
- **Unit, refresh:** each trigger does what the table says (insert, update, cancel, remove when not public, guest refresh, ended event, partial
  guest read touches nothing), and the hourly sync tests still pass on the shared step.
- **Local end to end:** a test request signed with a local test secret is sent to the running app; a bad signature is refused; a good one is
  accepted (the refresh itself uses fakes in tests because the local setup has no Luma key).
- **Live (production, after release):** with the real webhook, change an event in Luma and see the site update; read the logs for the request
  (status and kind only).

## Release

Merge, the owner creates the webhook in Luma and sets `LUMA_WEBHOOK_SECRET`, redeploys, and changes an event in Luma to try it. No migration.
Until the secret exists the endpoint answers `500` and nothing changes; the hourly sync and **Sync now** keep working as today.
