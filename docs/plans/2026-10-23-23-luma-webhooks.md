# Luma webhooks Implementation Plan

**Goal:** Luma changes show on the site within seconds, through a signed `POST /api/webhooks/luma`.

**Spec:** `docs/specs/2026-10-23-23-luma-webhooks.md`

**Architecture:** The sync's per-event step moves into one shared function used by the hourly run and by a new
`refreshEvent`. A pure `webhook.ts` verifies the signature and reads the payload. The route verifies, answers 200 and
refreshes in `after()`, then expires the `events` cache. No migration, no new dependency.

## Tasks (tests first in each)

1. **Shared per-event step** (`src/lib/luma/sync.ts`, `sync.test.ts`): extract `syncEvent`; add `refreshEvent(luma, store, id, now)`
   (not public or not ours → mark removed if stored; otherwise same write + attendees as the hourly run) and
   `cancelEvent(store, id)`. Existing `runSync` tests must still pass.
2. **Signature and payload** (`src/lib/luma/webhook.ts`, `webhook.test.ts`): `verifySignature` (HMAC-SHA256 of `<t>.<body>`
   with the secret as given, constant time, 5 minute window, any matching `v1`), `parseWebhook` (type → action + event id).
3. **Wiring** (`src/lib/luma/run.ts`): `runLumaRefresh(id)` and `runLumaCancel(id)`.
4. **Route** (`src/app/api/webhooks/luma/route.ts`, `route.test.ts`): 500 without secret, 401 on bad signature, 413 over 1 MB,
   200 and one scheduled job otherwise; the job refreshes or cancels, then `revalidateTag("events", { expire: 0 })`; failures
   are logged by kind only.
5. **Checks and local end to end:** lint, unit tests, DB tests, build, tsc; a signed request to the running app (bad
   signature refused, good one accepted).
