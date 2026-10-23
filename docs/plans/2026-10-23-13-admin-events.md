# Admin screens for events — implementation plan

> Tests are written first in every task. Nothing is committed or pushed until the owner says "ship it" (Task 8).

**Goal:** An admin-only `/admin/events` screen to hide events, mark them Featured, run the Luma sync by hand and see
sync failures, backed by database rules that only admins can use.

**Spec:** `docs/specs/2026-10-23-13-admin-events.md` (approved).

**Architecture:** `public.is_admin()` plus admin-only policies and column grants on `events`; a `public.admin_events()`
function gives admins the full rows. Server actions check admin first (guard), then write with the user's own session
so the database checks again; Sync now runs the shared `runLumaSync()` that the cron also uses.

## Global constraints

- Database changes only by timestamped migration files. Production gets no manual edits.
- **Production does not grant new objects automatically** (see memory `prod-supabase-no-default-grants`): every table
  and function this plan creates grants exactly what it needs, explicitly, and a test checks it.
- Admins can only change `hidden` and `featured` from the site (column grants). Members and visitors cannot read the
  sync columns any more.
- Every admin action checks admin on the server first, fails closed (a failed check means "not an admin"), then
  expires the events cache with `updateTag("events")` (the cron route keeps `revalidateTag("events", "max")`).
- Pages read at request time (`Suspense` + `await connection()`), never during the build.
- New text goes in `src/lib/copy.ts`, English.
- A non-admin must not learn that `/admin/events` exists: logged in but not admin gets the standard not-found page;
  logged out is sent to `/login?next=/admin/events`.

## Files

| File | Responsibility |
|---|---|
| `supabase/migrations/20261023070000_admin_events.sql` | `is_admin()`, admin policies, column grants, `admin_events()` |
| `supabase/migrations/20261023070100_appoint_owner_admin.sql` | makes `klee@sazze.vc` an admin |
| `supabase/tests/admin_events.test.sql` | admin rules, column grants, `admin_events()` |
| `supabase/tests/appoint_admin.test.sql` | the appointment statement |
| `src/lib/luma/run.ts` (+ test) | `runLumaSync()`, `MissingConfigError` |
| `src/app/api/cron/luma-sync/route.ts` (+ test) | uses `runLumaSync()` |
| `src/lib/admin/guard.ts` (+ test) | `checkAdmin`, `getAdmin` |
| `src/lib/admin/helpers.ts` (+ test) | `parseSwitch`, `eventFlags`, `lastSyncedAt`, `AdminEvent` |
| `src/app/admin/events/actions.ts` (+ test) | `setFeatured`, `setHidden`, `syncNow` |
| `src/app/admin/events/page.tsx`, `admin-switch.tsx`, `sync-button.tsx` | the screen |
| `src/components/site-header.tsx`, `src/lib/copy.ts` | Admin link, text |

---

### Task 1: Database rules (tests first)

- [ ] **Step 1: write `supabase/tests/admin_events.test.sql`** (plan 17). Setup, as the superuser: two auth users A
  (`aaaaaaaa-0000-0000-0000-000000000001`) and B (`...0002`) with profiles made by the signup trigger, then
  `update public.profiles set role = 'admin' where id = A`; four events with slugs `adm-visible`, `adm-hidden`,
  `adm-removed`, `adm-cancelled` (visible; `hidden = true`; `removed_from_luma = true`; `status = 'cancelled'`), a
  `luma_sync_error` text on `adm-visible`. Every count is scoped with `where slug like 'adm-%'`. Assertions:
  1. as A (`set local role authenticated` + `request.jwt.claims` with `sub` A): `public.is_admin()` is true;
  2. as B: `is_admin()` is false;
  3. as `anon`: `select public.is_admin()` throws `42501`;
  4. as A: `select count(*) from public.events where slug like 'adm-%'` is 4 (admin reads hidden, removed, cancelled);
  5. as A: `select count(*) from public.admin_events() where slug like 'adm-%'` is 4;
  6. as A: `select luma_sync_error from public.admin_events() where slug = 'adm-visible'` returns the error text;
  7. as B: `admin_events()` returns 0 rows for `adm-%`;
  8. as `anon`: `select * from public.admin_events()` throws `42501`;
  9. as A: `update public.events set featured = true, hidden = true where slug = 'adm-visible'` works and a following
     `select featured, hidden ... ` returns `true, true` (read it through `admin_events()`);
  10. as A: `update public.events set title = 'x' where slug = 'adm-visible'` throws `42501`;
  11. as B: `update public.events set featured = true` throws `42501`;
  12. as B: `select luma_sync_error from public.events` throws `42501`; as `anon` the same;
  13. as B: `select count(*) from public.events where slug like 'adm-%'` is 1 (the visible one only, so the
      column-limited grants did not break the row policy; note step 9 hid it for A's session, so run this check
      before step 9, or re-select the row's `slug`);
  14. as B: `select slug, title, featured, status from public.events where slug = 'adm-visible'` returns one row.
  Use the existing tests (`events.test.sql`, `profiles.test.sql`) as the pattern for roles and claims.
- [ ] **Step 2: run `supabase db reset && npm run test:db`, expect FAIL** (`is_admin` does not exist).
- [ ] **Step 3: write the migration** `20261023070000_admin_events.sql`:

```sql
create function public.is_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admins read all events" on public.events
  for select to authenticated using (public.is_admin());
create policy "admins update events" on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Visitors and members read only the public columns (the sync columns stay private).
revoke select on public.events from anon, authenticated;
grant select (id, slug, title, description, start_at, end_at, timezone, location_type, venue_name, venue_city,
              venue_address, cover_url, luma_url, status, hidden, removed_from_luma, featured, created_at, updated_at)
  on public.events to anon, authenticated;
-- Admins can change only these two columns from the site.
grant update (hidden, featured) on public.events to authenticated;

create function public.admin_events() returns setof public.events
language sql stable security definer
set search_path = ''
as $$
  select * from public.events where public.is_admin() order by start_at desc
$$;
revoke execute on function public.admin_events() from public, anon;
grant execute on function public.admin_events() to authenticated;
```

  `hidden` and `removed_from_luma` are in the public grant because the "anyone reads visible events" policy reads them;
  for every row a visitor can see they are always `false`.
- [ ] **Step 4: reset and run the database tests, expect PASS.** If Postgres refuses a policy column that is not
  granted, add that column to the grant (never table-wide) and keep step 12 passing.
- [ ] **Step 5: production-like check.** Locally run `revoke all on function public.is_admin() from authenticated`,
  confirm test 1 fails, then `supabase migration up`/reset to restore; this proves the explicit `grant execute` matters.

### Task 2: Appoint the owner (tests first)

- [ ] **Step 1: write `supabase/tests/appoint_admin.test.sql`** (plan 4). Insert auth users `klee@sazze.vc` and
  `other@example.com` (profiles come from the trigger), then run the exact statement from the migration, then assert:
  the klee profile is `admin`, the other is `member`; running it again changes nothing; with no `klee@sazze.vc` user
  (delete it first) the statement updates 0 rows and raises no error.
- [ ] **Step 2: run, expect FAIL** is not meaningful for a statement test, so first assert the test fails when the
  statement is commented out, then pass it.
- [ ] **Step 3: migration** `20261023070100_appoint_owner_admin.sql`:

```sql
-- The owner is the first admin. Does nothing if the account does not exist yet.
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'klee@sazze.vc';
```

- [ ] **Step 4: `npm run test:db` all green.**

### Task 3: Shared sync runner and the cron route

**Files:** `src/lib/luma/run.ts`, `src/lib/luma/run.test.ts`, `src/app/api/cron/luma-sync/route.ts`.

- [ ] **Step 1: failing test** `run.test.ts` (mock `./sync`, `./client`, `@/lib/supabase/admin`, `@/lib/events/store`):
  with `LUMA_API_KEY` unset it rejects with an error whose `name` is `MissingConfigError` and does not call `runSync`; with it
  set it calls `runSync` once and returns its result; if `runSync` rejects, `runLumaSync` rejects with the same error.
- [ ] **Step 2: implement** `src/lib/luma/run.ts`:

```ts
import { createEventStore } from "@/lib/events/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLumaClient } from "./client";
import { runSync, type SyncResult } from "./sync";

export class MissingConfigError extends Error {
  constructor(name: string) {
    super(`${name} is not set`);
    this.name = "MissingConfigError";
  }
}

// The one place that wires the Luma client, the service-role store and the sync together.
export async function runLumaSync(): Promise<SyncResult> {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) throw new MissingConfigError("LUMA_API_KEY");
  return runSync(createLumaClient({ apiKey }), createEventStore(createAdminClient()));
}
```

- [ ] **Step 3: the cron route** keeps its checks and responses. Replace the `LUMA_API_KEY` check and the sync call by
  one `try` that calls `runLumaSync()`: `MissingConfigError` answers 500 `{error:"not configured"}`, any other error answers
  502 `{error:"sync failed"}` (logging only the error name), success calls `revalidateTag("events","max")` and returns the
  counts. The existing `route.test.ts` must pass unchanged (its mocks of `@/lib/luma/sync`, client, admin and store still apply).
- [ ] **Step 4: `npx vitest run src/lib/luma src/app/api`, expect PASS.**

### Task 4: Admin guard and helpers (tests first)

**Files:** `src/lib/admin/guard.ts`, `src/lib/admin/helpers.ts` and their tests.

- [ ] **Step 1: failing tests.**
  `guard.test.ts` with a fake client `{ auth: { getClaims }, rpc }`: no claims gives `{ status: "logged-out" }` and `rpc` is
  not called; claims plus `rpc("is_admin")` returning `{ data: true }` gives `{ status: "admin", userId }`; `{ data: false }`,
  `{ data: null }` and `{ error: {...} }` all give `{ status: "not-admin" }` (fails closed).
  `helpers.test.ts`: `parseSwitch` accepts `id` = a uuid and `value` = `"true"` or `"false"` and returns `{ id, value }`;
  rejects a missing or non-uuid id, `"yes"`, `"1"`, an empty value (returns `null`); `eventFlags` returns `["hidden"]`,
  `["removed"]`, `["sync-error"]` for the matching event and combinations in that order, `[]` for a clean one;
  `lastSyncedAt` returns the latest `luma_synced_at` or `null`.
- [ ] **Step 2: implement.** `helpers.ts`:

```ts
export type AdminEvent = {
  id: string; slug: string; title: string; start_at: string; end_at: string | null; timezone: string;
  status: "published" | "cancelled"; hidden: boolean; featured: boolean; removed_from_luma: boolean;
  luma_synced_at: string | null; luma_sync_status: "ok" | "error" | null; luma_sync_error: string | null;
};
export type EventFlag = "hidden" | "removed" | "sync-error";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSwitch(formData: FormData): { id: string; value: boolean } | null {
  const id = String(formData.get("id") ?? "");
  const value = String(formData.get("value") ?? "");
  if (!UUID.test(id) || (value !== "true" && value !== "false")) return null;
  return { id, value: value === "true" };
}

export function eventFlags(e: Pick<AdminEvent, "hidden" | "removed_from_luma" | "luma_sync_status">): EventFlag[] {
  const flags: EventFlag[] = [];
  if (e.hidden) flags.push("hidden");
  if (e.removed_from_luma) flags.push("removed");
  if (e.luma_sync_status === "error") flags.push("sync-error");
  return flags;
}

export function lastSyncedAt(events: Pick<AdminEvent, "luma_synced_at">[]): string | null {
  const times = events.map((e) => e.luma_synced_at).filter((t): t is string => Boolean(t));
  return times.length === 0 ? null : times.reduce((a, b) => (a > b ? a : b));
}
```

  `guard.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminCheck =
  | { status: "logged-out" }
  | { status: "not-admin" }
  | { status: "admin"; userId: string };

// Fails closed: anything other than an explicit `true` from the database means "not an admin".
export async function checkAdmin(supabase: Pick<SupabaseClient, "auth" | "rpc">): Promise<AdminCheck> {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { status: "logged-out" };
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  return !error && isAdmin === true ? { status: "admin", userId } : { status: "not-admin" };
}

export async function getAdmin() {
  const supabase = await createClient();
  return { supabase, check: await checkAdmin(supabase) };
}
```

- [ ] **Step 3: `npx vitest run src/lib/admin`, expect PASS.**

### Task 5: Server actions (tests first)

**File:** `src/app/admin/events/actions.ts`, test `actions.test.ts` (mock `@/lib/admin/guard`, `next/cache`, `@/lib/luma/run`).

```ts
export type AdminActionState = { error?: string; sync?: { created: number; updated: number; removed: number; errors: number } };
export function setFeatured(prev: AdminActionState, formData: FormData): Promise<AdminActionState>;
export function setHidden(prev: AdminActionState, formData: FormData): Promise<AdminActionState>;
export function syncNow(prev: AdminActionState): Promise<AdminActionState>;
```

- [ ] **Step 1: failing tests.** For `setFeatured` and `setHidden`: logged-out or not-admin returns `{ error }`, never calls
  `from(...).update`, never calls `updateTag`; a bad form (`parseSwitch` null) returns `{ error }` without updating; an admin
  with a valid form calls `update({ featured: value })` (or `hidden`) with `.eq("id", id)`, then `updateTag("events")`
  and `revalidatePath("/admin/events")`, returns `{}`; an update that errors or matches no row returns `{ error }`, no revalidate.
  For `syncNow`: non-admin returns `{ error }` and does not call `runLumaSync`; admin success returns `{ sync: counts }` and
  revalidates both; a `MissingConfigError` returns `{ error: "Luma sync is not configured." }`; any other error returns
  `{ error: "Sync failed." }` (not the message). Logged-out for any action calls `redirect("/login?next=/admin/events")`.
- [ ] **Step 2: implement.** Shared helper `updateFlag(column: "featured" | "hidden", formData)`: `getAdmin()`; logged-out
  `redirect(...)`; not-admin returns `{ error: copy.admin.errors.forbidden }`; `parseSwitch`; update through `supabase.from("events")
  .update({ [column]: value }).eq("id", id).select("id").maybeSingle()`; error or no row returns `{ error: copy.admin.errors.save }`;
  then `updateTag("events")`, `revalidatePath("/admin/events")`, return `{}`. `syncNow` follows the spec.
- [ ] **Step 3: `npx vitest run src/app/admin`, expect PASS.**

### Task 6: The screen, header link and copy

- [ ] **copy:** add `nav.admin: "Admin"` and an `admin` block: title "Manage events", syncNow "Sync now", syncing "Syncing…",
  lastSync "Last sync", never "never", result template parts, labels (Hidden, Removed from Luma, Sync error), switch labels
  (Featured, Hidden), errors (`forbidden`, `save`, `notConfigured`, `syncFailed`), `empty` "No events yet."
- [ ] **`page.tsx`:** `Suspense` + `await connection()`; `getAdmin()`; logged-out `redirect("/login?next=/admin/events")`;
  not-admin `notFound()`; `supabase.rpc("admin_events")` (throw on error); show last sync time (`lastSyncedAt`) and the sync
  button, then one `<li>` per event: title linking to `/events/[slug]` only when the event is public (not hidden, removed or
  cancelled), date via `formatEventTime`, flag labels from `eventFlags` (with `luma_sync_error` text for `sync-error`), and two
  `AdminSwitch` forms.
- [ ] **`admin-switch.tsx`** (client): `useActionState(action, {})`; a `<form>` with hidden inputs `id` and `value` (the new
  value) and a button showing the label and the current state (`aria-pressed`); shows `state.error` in `role="alert"` text.
- [ ] **`sync-button.tsx`** (client): `useActionState(syncNow, {})`; button disabled while pending with the "Syncing…" text; shows
  the counts or the error after a run.
- [ ] **header:** in `AuthNav`, after the signed-in check, call `supabase.rpc("is_admin")`; show an **Admin** link to
  `/admin/events` only when it returns `true`.
- [ ] **check:** `npm run lint && npx tsc --noEmit && npm test && npm run build` (run `build` before `tsc` in a fresh worktree so
  `PageProps` types exist).

### Task 7: Browser QA (local)

- [ ] `supabase db reset`, `./scripts/dev-env.sh`, seed events with SQL (visible, hidden, one with `luma_sync_status='error'`),
  `npm run dev`. With `/browse` (wait for streamed content before reading):
  logged out `/admin/events` goes to `/login?next=/admin/events`; log in by magic link (Mailpit) as a test user: `/admin/events`
  is the not-found page and the header has no Admin link; set that user's `role` to `admin` by SQL: the Admin link appears and the
  list shows all events with the right labels and the error text; **Featured** on a future event shows it in the home page's
  Featured section; **Hidden** removes an event from `/events`, `/` and its own page (the admin list still shows it);
  switching back restores it; **Sync now** without `LUMA_API_KEY` shows "Luma sync is not configured."; 375px width.
- [ ] REST check: with a member session token or only the publishable key, `GET /rest/v1/events?select=luma_sync_error`
  returns an error and `PATCH` fails.

### Task 8: Final checks and handover

- [ ] `npm run lint && npm test && npm run test:db && npm run build`; no secret in the diff.
- [ ] Report to the owner and wait for "ship it".
- [ ] After "ship it": commit (spec and plan, then code), push, PR with `Closes #13`, checks, merge. Then the owner runs
  `supabase db push --linked`; I verify on production: the migration list, that `klee@sazze.vc` is the only admin (count
  only), `/admin/events` for the owner (the owner presses **Sync now** and tries Featured on one event, then undoes it), and
  that logged-out `/admin/events` redirects. Close the issue, remove the worktree.

## Self-review against the spec

Admin appointment (Task 2); `is_admin()`, admin policies, column-limited updates, `admin_events()`, narrowed public columns
(Task 1); guard fails closed and non-admin sees not-found (Tasks 4, 6); switches and Sync now write after the admin check and
refresh the cache (Task 5); shared sync runner (Task 3); admin link only for admins (Task 6); testing list (Tasks 1-5, 7);
release (Task 8). Names used across tasks: `is_admin`, `admin_events`, `checkAdmin`, `getAdmin`, `AdminCheck`, `parseSwitch`,
`eventFlags`, `lastSyncedAt`, `AdminEvent`, `AdminActionState`, `runLumaSync`, `MissingConfigError`.
