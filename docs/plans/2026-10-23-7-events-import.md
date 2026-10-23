# Events from Luma — implementation plan

> **For agentic workers:** execute task by task with checkbox (`- [ ]`) steps. Tests are written first. Per the
> project's rules, nothing is committed or pushed until the owner says "ship it"; the commit happens in Task 9.

**Goal:** Import the public events of our Luma calendar into an `events` table every hour, and show them on
`/events` and `/events/[slug]` without login.

**Architecture:** A read-only Luma client (`GET` only) feeds a pure sync function that writes through a small
store interface (Supabase service role in production, an in-memory fake in tests). A Vercel cron calls a
secret-protected route handler that runs the sync and then calls `revalidateTag("events", "max")`. Pages read
through cached query functions (`"use cache"`, tag `events`) from inside `Suspense` + `await connection()`, so
nothing touches the database at build time.

**Tech Stack:** Next.js 16 (`cacheComponents: true`), React 19, Supabase (Postgres + RLS, pgTAP), `@supabase/supabase-js`,
Vitest, Tailwind. No new dependencies.

**Spec:** `docs/specs/2026-10-23-7-events-import.md` (approved). Platform design: `docs/specs/2026-10-22-82startup-platform-design.md`.

## Global Constraints

- The Luma API key (`LUMA_API_KEY`) is server-only, never `NEXT_PUBLIC_`, never logged, never in chat or commits.
  It has full calendar access, so **the Luma client can only send `GET` requests** to
  `/v1/calendars/events/list` and `/v1/events/get`.
- Database changes only through a timestamped migration file. Never edit production data by hand.
- Only events with `visibility = public` are imported. The sync never deletes rows and never changes `hidden`.
- The sync writes nothing and hides nothing if the Luma listing fails or does not finish.
- Pages read the database at request time (`Suspense` + `await connection()`), never during `next build`.
- `params` and `searchParams` are async: `await` them. Read the matching guide in `node_modules/next/dist/docs/`
  before changing Next.js code (already read for this plan: `use-cache`, `revalidateTag`, dynamic routes,
  `generateMetadata`).
- New user-facing text goes in `src/lib/copy.ts`. English, matching the existing copy.
- The Vercel cron schedule is `0 * * * *`. Vercel sends `Authorization: Bearer $CRON_SECRET` to cron routes.

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261023050000_events.sql` | `events` table, enum, RLS, grants |
| `supabase/tests/events.test.sql` | access-rule and constraint tests |
| `src/lib/luma/types.ts` | the parts of Luma's responses we read |
| `src/lib/luma/map.ts` | Luma event to our row fields; slug |
| `src/lib/luma/client.ts` | read-only Luma client (list, get) |
| `src/lib/luma/sync.ts` | the sync algorithm, with `LumaReader` and `EventStore` interfaces |
| `src/lib/supabase/admin.ts` | service-role Supabase client (server only) |
| `src/lib/events/store.ts` | `EventStore` backed by Supabase |
| `src/app/api/cron/luma-sync/route.ts` | cron entry: auth, run, revalidate |
| `vercel.json` | hourly cron |
| `src/lib/events/types.ts` | `PublicEvent` shape used by pages |
| `src/lib/events/split.ts` | upcoming / past split and ordering |
| `src/lib/events/format.ts` | time range and venue label text |
| `src/lib/events/queries.ts` | cached public reads (anon Supabase client) |
| `src/components/event-card.tsx` | card used on `/events` |
| `src/app/events/page.tsx`, `src/app/events/[slug]/page.tsx` | the two pages |
| `src/components/site-header.tsx`, `src/lib/copy.ts`, `scripts/dev-env.sh` | header link, text, local env |

---

### Task 1: Database table and access rules

**Files:**
- Create: `supabase/tests/events.test.sql`, `supabase/migrations/20261023050000_events.sql`

**Produces:** table `public.events` with the columns used in every later task.

- [ ] **Step 1: Write the failing database test**

`supabase/tests/events.test.sql`:

```sql
begin;
select plan(13);

insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url, hidden, removed_from_luma, status) values
  ('evt-visible',   'visible-aaaa',   'Visible',   now() + interval '1 day', 'America/Los_Angeles', 'https://luma.com/aaaa', false, false, 'published'),
  ('evt-hidden',    'hidden-bbbb',    'Hidden',    now(), 'UTC', 'https://luma.com/bbbb', true,  false, 'published'),
  ('evt-removed',   'removed-cccc',   'Removed',   now(), 'UTC', 'https://luma.com/cccc', false, true,  'published'),
  ('evt-cancelled', 'cancelled-dddd', 'Cancelled', now(), 'UTC', 'https://luma.com/dddd', false, false, 'cancelled');

-- logged out
set local role anon;
select is((select count(*) from public.events), 1::bigint, 'logged-out visitors read only the one visible event');
select is((select slug from public.events), 'visible-aaaa', 'and it is the published, shown, still-in-Luma one');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-x', 'x', 'X', now(), 'UTC', 'https://luma.com/x')$$, '42501', null, 'logged-out visitors cannot insert');
select throws_ok($$update public.events set title = 'Hacked'$$, '42501', null, 'logged-out visitors cannot update');
select throws_ok($$delete from public.events$$, '42501', null, 'logged-out visitors cannot delete');

-- logged-in member
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*) from public.events), 1::bigint, 'a member also reads only the visible event');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-y', 'y', 'Y', now(), 'UTC', 'https://luma.com/y')$$, '42501', null, 'a member cannot insert');
select throws_ok($$update public.events set hidden = false$$, '42501', null, 'a member cannot update');
select throws_ok($$delete from public.events$$, '42501', null, 'a member cannot delete');

-- constraints (as the superuser, like the sync's service role)
reset role;
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-visible', 'other', 'Dup id', now(), 'UTC', 'https://luma.com/z')$$, '23505', null, 'luma_event_id is unique');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-z', 'visible-aaaa', 'Dup slug', now(), 'UTC', 'https://luma.com/z')$$, '23505', null, 'slug is unique');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url, cover_url) values ('evt-c', 'c', 'C', now(), 'UTC', 'https://luma.com/c', 'http://insecure.example.com/c.jpg')$$, '23514', null, 'cover_url must be https');
select throws_ok($$insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values ('evt-l', 'l', 'L', now(), 'UTC', 'javascript:alert(1)')$$, '23514', null, 'luma_url must be https');

select * from finish();
rollback;
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:db`
Expected: `events.test.sql` fails (`relation "public.events" does not exist`); the other tests pass.

- [ ] **Step 3: Write the migration**

`supabase/migrations/20261023050000_events.sql`:

```sql
create type public.event_status as enum ('published', 'cancelled');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  luma_event_id text not null unique,
  slug text not null unique,
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  timezone text not null,
  location_type text not null default 'unknown',
  venue_name text,
  venue_city text,
  venue_address text,
  cover_url text check (cover_url is null or cover_url ~ '^https://\S+$'),
  luma_url text not null check (luma_url ~ '^https://\S+$'),
  status public.event_status not null default 'published',
  hidden boolean not null default false,
  removed_from_luma boolean not null default false,
  show_on_home boolean not null default false,
  featured boolean not null default false,
  luma_synced_at timestamptz,
  luma_sync_status text check (luma_sync_status in ('ok', 'error')),
  luma_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_start_at_idx on public.events (start_at);

alter table public.events enable row level security;

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create policy "anyone reads visible events" on public.events
  for select to anon, authenticated
  using (status = 'published' and not hidden and not removed_from_luma);

revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;
```

- [ ] **Step 4: Apply and run the tests**

Run: `supabase db reset && npm run test:db`
Expected: all test files pass, `events.test.sql` shows 13 passing.

---

### Task 2: Luma types and the mapper

**Files:**
- Create: `src/lib/luma/types.ts`, `src/lib/luma/map.ts`
- Test: `src/lib/luma/map.test.ts`

**Produces:**
- `LumaCalendarEvent`, `LumaEventDetail` (types.ts)
- `EventFields`, `mapEvent(e: LumaCalendarEvent): EventFields | null`, `makeSlug(title: string, lumaId: string): string` (map.ts)

- [ ] **Step 1: Write the types** (no test needed; they are shapes only)

`src/lib/luma/types.ts`:

```ts
// Only the fields we read, from Luma's API reference (https://public-api.luma.com/openapi.json).
export type LumaAddress = {
  address: string;
  city: string | null;
  region: string | null;
  country: string | null;
  city_state: string | null;
  full_address: string | null;
};

export type LumaCalendarEvent = {
  platform: string;
  id: string;
  start_at: string;
  end_at?: string;
  timezone: string;
  name: string;
  cover_url?: string;
  url: string;
  visibility?: string;
  location_type?: string;
  location_visibility?: string;
  geo_address_json?: LumaAddress | null;
};

export type LumaEventDetail = LumaCalendarEvent & { description?: string };
```

- [ ] **Step 2: Write the failing mapper test**

`src/lib/luma/map.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeSlug, mapEvent } from "./map";
import type { LumaCalendarEvent } from "./types";

const base: LumaCalendarEvent = {
  platform: "luma",
  id: "evt-A1b2C3d4Xyz",
  start_at: "2026-11-07T02:00:00.000Z",
  end_at: "2026-11-07T04:00:00.000Z",
  timezone: "America/Los_Angeles",
  name: "  AI Founders Meetup ",
  cover_url: "https://images.lumacdn.com/c.jpg",
  url: "https://luma.com/ai-founders",
  visibility: "public",
  location_type: "offline",
  location_visibility: "public",
  geo_address_json: {
    address: "Frontier Tower",
    city: "San Francisco",
    region: "California",
    country: "US",
    city_state: "San Francisco, California",
    full_address: "995 Market St, San Francisco, CA 94103, USA",
  },
};

describe("mapEvent", () => {
  it("maps a public Luma event to row fields", () => {
    expect(mapEvent(base)).toEqual({
      luma_event_id: "evt-A1b2C3d4Xyz",
      title: "AI Founders Meetup",
      start_at: "2026-11-07T02:00:00.000Z",
      end_at: "2026-11-07T04:00:00.000Z",
      timezone: "America/Los_Angeles",
      location_type: "offline",
      venue_name: "Frontier Tower",
      venue_city: "San Francisco",
      venue_address: "995 Market St, San Francisco, CA 94103, USA",
      cover_url: "https://images.lumacdn.com/c.jpg",
      luma_url: "https://luma.com/ai-founders",
    });
  });

  it("skips events that are not on Luma or not public", () => {
    expect(mapEvent({ ...base, platform: "external" })).toBeNull();
    for (const visibility of ["members-only", "private", undefined]) {
      expect(mapEvent({ ...base, visibility })).toBeNull();
    }
  });

  it("skips events with a non-https page address or missing basics", () => {
    for (const url of ["http://luma.com/x", "javascript:alert(1)", "", "https://"]) {
      expect(mapEvent({ ...base, url })).toBeNull();
    }
    expect(mapEvent({ ...base, name: "" })).toBeNull();
    expect(mapEvent({ ...base, timezone: "" })).toBeNull();
  });

  it("skips events with an unreadable start time", () => {
    expect(mapEvent({ ...base, start_at: "not a date" })).toBeNull();
  });

  it("keeps end_at null when Luma sends none or an unreadable one", () => {
    expect(mapEvent({ ...base, end_at: undefined })).toMatchObject({ end_at: null });
    expect(mapEvent({ ...base, end_at: "nope" })).toMatchObject({ end_at: null });
  });

  it("drops a cover image that is not https", () => {
    expect(mapEvent({ ...base, cover_url: "http://x.example.com/c.jpg" })).toMatchObject({ cover_url: null });
    expect(mapEvent({ ...base, cover_url: undefined })).toMatchObject({ cover_url: null });
  });

  it("stores only the city when the address is for guests only", () => {
    expect(mapEvent({ ...base, location_visibility: "guests-only" })).toMatchObject({
      venue_name: null,
      venue_address: null,
      venue_city: "San Francisco",
    });
  });

  it("handles online events with no address", () => {
    expect(mapEvent({ ...base, location_type: "zoom", geo_address_json: null })).toMatchObject({
      location_type: "zoom",
      venue_name: null,
      venue_city: null,
      venue_address: null,
    });
  });
});

describe("makeSlug", () => {
  it("joins a cleaned title and the first 8 characters of the Luma id", () => {
    expect(makeSlug("AI Founders Meetup!", "evt-A1b2C3d4Xyz")).toBe("ai-founders-meetup-a1b2c3d4");
  });

  it("falls back to 'event' when the title has no ASCII letters or digits", () => {
    expect(makeSlug("한국 창업가 모임", "evt-abcdefgh1")).toBe("event-abcdefgh");
  });

  it("cuts a long title to 50 characters without a trailing dash", () => {
    const slug = makeSlug("a ".repeat(60), "evt-abcdefgh1");
    expect(slug.endsWith("-abcdefgh")).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(50 + 1 + 8);
    expect(slug).not.toContain("--");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run src/lib/luma/map.test.ts`
Expected: FAIL (cannot find `./map`).

- [ ] **Step 4: Write the mapper**

`src/lib/luma/map.ts`:

```ts
import type { LumaCalendarEvent } from "./types";

export type EventFields = {
  luma_event_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  location_type: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_address: string | null;
  cover_url: string | null;
  luma_url: string;
};

const HTTPS_URL = /^https:\/\/\S+$/;

function toIso(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Returns null for an event we must not import (not on Luma, not public, or unusable).
export function mapEvent(e: LumaCalendarEvent): EventFields | null {
  if (e.platform !== "luma") return null;
  if (e.visibility !== "public") return null;
  if (!e.id || !e.name?.trim() || !e.timezone) return null;
  if (!HTTPS_URL.test(e.url ?? "")) return null;

  const start = toIso(e.start_at);
  if (!start) return null;

  const guestsOnly = e.location_visibility === "guests-only";
  const geo = e.geo_address_json ?? null;

  return {
    luma_event_id: e.id,
    title: e.name.trim(),
    start_at: start,
    end_at: toIso(e.end_at),
    timezone: e.timezone,
    location_type: e.location_type ?? "unknown",
    venue_name: guestsOnly ? null : geo?.address || null,
    venue_city: geo?.city || null,
    venue_address: guestsOnly ? null : geo?.full_address || null,
    cover_url: e.cover_url && HTTPS_URL.test(e.cover_url) ? e.cover_url : null,
    luma_url: e.url,
  };
}

export function makeSlug(title: string, lumaId: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/, "") || "event";
  const suffix = lumaId.replace(/^evt-/, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run src/lib/luma/map.test.ts`
Expected: PASS (11 tests).

---

### Task 3: Read-only Luma client

**Files:**
- Create: `src/lib/luma/client.ts`
- Test: `src/lib/luma/client.test.ts`

**Consumes:** `LumaCalendarEvent`, `LumaEventDetail` (Task 2).
**Produces:** `LumaReader` interface, `createLumaClient(opts): LumaReader`, `LumaError`, `READ_PATHS`.

```ts
export interface LumaReader {
  listCalendarEvents(): Promise<LumaCalendarEvent[]>;
  getEvent(eventId: string): Promise<LumaEventDetail>;
}
```

- [ ] **Step 1: Write the failing test**

`src/lib/luma/client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { LumaError, READ_PATHS, createLumaClient } from "./client";

function fakeFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Array<{ url: URL; init: RequestInit | undefined }> = [];
  let i = 0;
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), init });
    const r = responses[i++] ?? { status: 500, body: {} };
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const ev = (id: string) => ({ id, platform: "luma" });

describe("createLumaClient", () => {
  it("follows next_cursor until has_more is false and joins the pages", async () => {
    const { fetch, calls } = fakeFetch([
      { body: { entries: [ev("evt-1"), ev("evt-2")], has_more: true, next_cursor: "c1" } },
      { body: { entries: [ev("evt-3")], has_more: false } },
    ]);
    const client = createLumaClient({ apiKey: "k", fetch });
    const events = await client.listCalendarEvents();
    expect(events.map((e) => e.id)).toEqual(["evt-1", "evt-2", "evt-3"]);
    expect(calls[0].url.pathname).toBe("/v1/calendars/events/list");
    expect(calls[0].url.searchParams.get("pagination_cursor")).toBeNull();
    expect(calls[1].url.searchParams.get("pagination_cursor")).toBe("c1");
  });

  it("reads one event by id", async () => {
    const { fetch, calls } = fakeFetch([{ body: { id: "evt-1", description: "Hello" } }]);
    const detail = await createLumaClient({ apiKey: "k", fetch }).getEvent("evt-1");
    expect(detail.description).toBe("Hello");
    expect(calls[0].url.pathname).toBe("/v1/events/get");
    expect(calls[0].url.searchParams.get("event_id")).toBe("evt-1");
  });

  it("only ever sends GET with the API key header, to the two read paths", async () => {
    const { fetch, calls } = fakeFetch([
      { body: { entries: [], has_more: false } },
      { body: { id: "evt-1" } },
    ]);
    const client = createLumaClient({ apiKey: "secret-key", fetch });
    await client.listCalendarEvents();
    await client.getEvent("evt-1");
    for (const { url, init } of calls) {
      expect(init?.method).toBe("GET");
      expect(init?.body).toBeUndefined();
      expect((init?.headers as Record<string, string>)["x-luma-api-key"]).toBe("secret-key");
      expect(url.origin).toBe("https://public-api.luma.com");
      expect(READ_PATHS).toContain(url.pathname);
    }
    expect([...READ_PATHS].sort()).toEqual(["/v1/calendars/events/list", "/v1/events/get"]);
  });

  it("throws a LumaError with the status on 401, 403 and 429, without retrying", async () => {
    for (const status of [401, 403, 429]) {
      const { fetch, calls } = fakeFetch([{ status, body: { message: "no" } }]);
      await expect(createLumaClient({ apiKey: "k", fetch }).listCalendarEvents()).rejects.toMatchObject({
        name: "LumaError",
        status,
      });
      expect(calls).toHaveLength(1);
    }
  });

  it("never puts the API key in an error message", async () => {
    const { fetch } = fakeFetch([{ status: 401, body: {} }]);
    const error = await createLumaClient({ apiKey: "secret-key", fetch }).listCalendarEvents().catch((e) => e);
    expect(error).toBeInstanceOf(LumaError);
    expect(error.message).not.toContain("secret-key");
  });

  it("stops with an error if the listing never ends", async () => {
    const endless = Array.from({ length: 60 }, () => ({ body: { entries: [], has_more: true, next_cursor: "again" } }));
    const { fetch } = fakeFetch(endless);
    await expect(createLumaClient({ apiKey: "k", fetch }).listCalendarEvents()).rejects.toThrow(/pages/);
  });

  it("rejects a response that is not the expected shape", async () => {
    const { fetch } = fakeFetch([{ body: { nope: true } }]);
    await expect(createLumaClient({ apiKey: "k", fetch }).listCalendarEvents()).rejects.toThrow(/unexpected/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/luma/client.test.ts`
Expected: FAIL (cannot find `./client`).

- [ ] **Step 3: Write the client**

`src/lib/luma/client.ts`:

```ts
import type { LumaCalendarEvent, LumaEventDetail } from "./types";

export interface LumaReader {
  listCalendarEvents(): Promise<LumaCalendarEvent[]>;
  getEvent(eventId: string): Promise<LumaEventDetail>;
}

// The only Luma endpoints this app may call. Every request goes through get() below, which only sends GET.
export const READ_PATHS = ["/v1/calendars/events/list", "/v1/events/get"] as const;

const BASE_URL = "https://public-api.luma.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export class LumaError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "LumaError";
    this.status = status;
  }
}

type Options = { apiKey: string; fetch?: typeof fetch };

export function createLumaClient({ apiKey, fetch: fetchImpl = fetch }: Options): LumaReader {
  async function get(path: (typeof READ_PATHS)[number], params: Record<string, string>): Promise<unknown> {
    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "GET",
        headers: { "x-luma-api-key": apiKey, accept: "application/json" },
        cache: "no-store",
      });
    } catch {
      throw new LumaError(`Luma request to ${path} failed (network)`);
    }
    if (!res.ok) throw new LumaError(`Luma request to ${path} failed with status ${res.status}`, res.status);
    return res.json();
  }

  return {
    async listCalendarEvents() {
      const events: LumaCalendarEvent[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const params: Record<string, string> = { pagination_limit: String(PAGE_SIZE) };
        if (cursor) params.pagination_cursor = cursor;
        const body = (await get("/v1/calendars/events/list", params)) as {
          entries?: LumaCalendarEvent[];
          has_more?: boolean;
          next_cursor?: string;
        };
        if (!body || !Array.isArray(body.entries)) throw new LumaError("Luma list response had an unexpected shape");
        events.push(...body.entries);
        if (!body.has_more) return events;
        if (!body.next_cursor) throw new LumaError("Luma list said there is more but sent no cursor");
        cursor = body.next_cursor;
      }
      throw new LumaError(`Luma list did not end after ${MAX_PAGES} pages`);
    },

    async getEvent(eventId) {
      const body = (await get("/v1/events/get", { event_id: eventId })) as LumaEventDetail;
      if (!body || typeof body !== "object" || !("id" in body)) {
        throw new LumaError("Luma event response had an unexpected shape");
      }
      return body;
    },
  };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run src/lib/luma/client.test.ts`
Expected: PASS (7 tests).

---

### Task 4: The sync algorithm

**Files:**
- Create: `src/lib/luma/sync.ts`
- Test: `src/lib/luma/sync.test.ts`

**Consumes:** `LumaReader` (Task 3), `mapEvent`, `makeSlug`, `EventFields` (Task 2).
**Produces:**

```ts
export type StoredEvent = { luma_event_id: string; start_at: string; end_at: string | null; removed_from_luma: boolean };
export type EventWrite = EventFields & { description?: string };
export interface EventStore {
  listStored(): Promise<StoredEvent[]>;
  insert(row: EventFields & { slug: string; description: string }): Promise<void>;
  update(lumaId: string, fields: EventWrite): Promise<void>; // also sets removed_from_luma = false
  markError(lumaId: string, message: string): Promise<void>;
  markRemoved(lumaIds: string[]): Promise<void>;
}
export type SyncResult = { created: number; updated: number; removed: number; errors: number };
export function runSync(luma: LumaReader, store: EventStore, now?: Date): Promise<SyncResult>;
```

- [ ] **Step 1: Write the failing test**

`src/lib/luma/sync.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { LumaReader } from "./client";
import { runSync, type EventStore, type StoredEvent } from "./sync";
import type { LumaCalendarEvent, LumaEventDetail } from "./types";

const NOW = new Date("2026-11-01T00:00:00.000Z");

function lumaEvent(id: string, over: Partial<LumaCalendarEvent> = {}): LumaCalendarEvent {
  return {
    platform: "luma",
    id,
    name: `Event ${id}`,
    start_at: "2026-12-01T18:00:00.000Z",
    end_at: "2026-12-01T20:00:00.000Z",
    timezone: "UTC",
    url: `https://luma.com/${id}`,
    visibility: "public",
    location_type: "offline",
    ...over,
  };
}

function fakeLuma(events: LumaCalendarEvent[], opts: { listError?: Error; detailErrors?: string[] } = {}) {
  const detailCalls: string[] = [];
  const reader: LumaReader = {
    async listCalendarEvents() {
      if (opts.listError) throw opts.listError;
      return events;
    },
    async getEvent(id): Promise<LumaEventDetail> {
      detailCalls.push(id);
      if (opts.detailErrors?.includes(id)) throw new Error(`detail failed for ${id}`);
      return { ...lumaEvent(id), description: `About ${id}` };
    },
  };
  return { reader, detailCalls };
}

function fakeStore(stored: StoredEvent[] = []) {
  const log = {
    inserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<{ id: string; fields: Record<string, unknown> }>,
    errors: [] as Array<{ id: string; message: string }>,
    removed: [] as string[][],
    listed: 0,
  };
  const store: EventStore = {
    async listStored() {
      log.listed++;
      return stored;
    },
    async insert(row) {
      log.inserts.push(row);
    },
    async update(id, fields) {
      log.updates.push({ id, fields });
    },
    async markError(id, message) {
      log.errors.push({ id, message });
    },
    async markRemoved(ids) {
      log.removed.push(ids);
    },
  };
  return { store, log };
}

const stored = (id: string, over: Partial<StoredEvent> = {}): StoredEvent => ({
  luma_event_id: id,
  start_at: "2026-12-01T18:00:00.000Z",
  end_at: "2026-12-01T20:00:00.000Z",
  removed_from_luma: false,
  ...over,
});

describe("runSync", () => {
  it("inserts a new public event with a slug and the description from get-event", async () => {
    const { reader, detailCalls } = fakeLuma([lumaEvent("evt-newone1")]);
    const { store, log } = fakeStore();
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ created: 1, updated: 0, removed: 0, errors: 0 });
    expect(detailCalls).toEqual(["evt-newone1"]);
    expect(log.inserts[0]).toMatchObject({
      luma_event_id: "evt-newone1",
      slug: "event-evt-newone1-newone1",
      description: "About evt-newone1",
    });
  });

  it("updates an existing upcoming event, refreshing its description, and keeps its slug", async () => {
    const { reader, detailCalls } = fakeLuma([lumaEvent("evt-a")]);
    const { store, log } = fakeStore([stored("evt-a")]);
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ created: 0, updated: 1, removed: 0, errors: 0 });
    expect(detailCalls).toEqual(["evt-a"]);
    expect(log.updates[0].fields).toMatchObject({ title: "Event evt-a", description: "About evt-a" });
    expect(log.updates[0].fields).not.toHaveProperty("slug");
  });

  it("does not read details for an event that already ended, and keeps its stored description", async () => {
    const past = lumaEvent("evt-old", { start_at: "2026-10-01T18:00:00.000Z", end_at: "2026-10-01T20:00:00.000Z" });
    const { reader, detailCalls } = fakeLuma([past]);
    const { store, log } = fakeStore([stored("evt-old", { start_at: past.start_at, end_at: past.end_at ?? null })]);
    await runSync(reader, store, NOW);
    expect(detailCalls).toEqual([]);
    expect(log.updates[0].fields).not.toHaveProperty("description");
  });

  it("reads details for a brand-new event even if it already ended", async () => {
    const past = lumaEvent("evt-past1", { start_at: "2026-10-01T18:00:00.000Z", end_at: "2026-10-01T20:00:00.000Z" });
    const { reader, detailCalls } = fakeLuma([past]);
    const { store, log } = fakeStore();
    await runSync(reader, store, NOW);
    expect(detailCalls).toEqual(["evt-past1"]);
    expect(log.inserts).toHaveLength(1);
  });

  it("never imports an event that is not public", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-priv", { visibility: "private" })]);
    const { store, log } = fakeStore();
    const result = await runSync(reader, store, NOW);
    expect(result.created).toBe(0);
    expect(log.inserts).toHaveLength(0);
  });

  it("marks stored events that left the list, or stopped being public, as removed (and never deletes)", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-kept"), lumaEvent("evt-now-private", { visibility: "private" })]);
    const { store, log } = fakeStore([stored("evt-kept"), stored("evt-gone"), stored("evt-now-private")]);
    const result = await runSync(reader, store, NOW);
    expect(result.removed).toBe(2);
    expect(log.removed).toEqual([["evt-gone", "evt-now-private"]]);
  });

  it("does not mark an already-removed event again, and writes removed_from_luma=false when an event comes back", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-back")]);
    const { store, log } = fakeStore([stored("evt-back", { removed_from_luma: true }), stored("evt-still-gone", { removed_from_luma: true })]);
    const result = await runSync(reader, store, NOW);
    expect(result.removed).toBe(0);
    expect(log.removed).toEqual([]);
    expect(log.updates.map((u) => u.id)).toEqual(["evt-back"]);
  });

  it("writes nothing and hides nothing when the Luma listing fails", async () => {
    const { reader } = fakeLuma([], { listError: new Error("Luma is down") });
    const { store, log } = fakeStore([stored("evt-a")]);
    await expect(runSync(reader, store, NOW)).rejects.toThrow("Luma is down");
    expect(log).toMatchObject({ inserts: [], updates: [], errors: [], removed: [] });
  });

  it("goes on after one event fails, counts it, and records the error only on an existing row", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-bad1"), lumaEvent("evt-new2"), lumaEvent("evt-ok3")], {
      detailErrors: ["evt-bad1", "evt-new2"],
    });
    const { store, log } = fakeStore([stored("evt-bad1")]);
    const result = await runSync(reader, store, NOW);
    expect(result).toEqual({ created: 1, updated: 0, removed: 0, errors: 2 });
    expect(log.errors).toEqual([{ id: "evt-bad1", message: "detail failed for evt-bad1" }]);
    expect(log.inserts.map((r) => r.luma_event_id)).toEqual(["evt-ok3"]);
  });

  it("never sends hidden or status to the store (the sync cannot undo an admin's hide)", async () => {
    const { reader } = fakeLuma([lumaEvent("evt-a"), lumaEvent("evt-new9")]);
    const { store, log } = fakeStore([stored("evt-a")]);
    await runSync(reader, store, NOW);
    for (const payload of [...log.inserts, ...log.updates.map((u) => u.fields)]) {
      expect(payload).not.toHaveProperty("hidden");
      expect(payload).not.toHaveProperty("status");
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/luma/sync.test.ts`
Expected: FAIL (cannot find `./sync`).

- [ ] **Step 3: Write the sync**

`src/lib/luma/sync.ts`:

```ts
import type { LumaReader } from "./client";
import { makeSlug, mapEvent, type EventFields } from "./map";

export type StoredEvent = {
  luma_event_id: string;
  start_at: string;
  end_at: string | null;
  removed_from_luma: boolean;
};

export type EventWrite = EventFields & { description?: string };

export interface EventStore {
  listStored(): Promise<StoredEvent[]>;
  insert(row: EventFields & { slug: string; description: string }): Promise<void>;
  // Also sets removed_from_luma = false and the sync columns. Never touches slug, hidden or status.
  update(lumaId: string, fields: EventWrite): Promise<void>;
  markError(lumaId: string, message: string): Promise<void>;
  markRemoved(lumaIds: string[]): Promise<void>;
}

export type SyncResult = { created: number; updated: number; removed: number; errors: number };

function hasEnded(fields: Pick<EventFields, "start_at" | "end_at">, now: Date): boolean {
  return new Date(fields.end_at ?? fields.start_at) < now;
}

export async function runSync(luma: LumaReader, store: EventStore, now: Date = new Date()): Promise<SyncResult> {
  // 1. Read everything first. If either read fails, nothing has been written yet.
  const listed = await luma.listCalendarEvents();
  const stored = await store.listStored();
  const storedById = new Map(stored.map((row) => [row.luma_event_id, row]));

  const result: SyncResult = { created: 0, updated: 0, removed: 0, errors: 0 };
  const seen = new Set<string>();

  // 2. Insert or update each public event.
  for (const entry of listed) {
    const fields = mapEvent(entry);
    if (!fields) continue;
    seen.add(fields.luma_event_id);
    const existing = storedById.get(fields.luma_event_id);

    try {
      let description: string | undefined;
      if (!existing || !hasEnded(fields, now)) {
        description = (await luma.getEvent(fields.luma_event_id)).description ?? "";
      }

      if (existing) {
        await store.update(fields.luma_event_id, description === undefined ? fields : { ...fields, description });
        result.updated++;
      } else {
        await store.insert({ ...fields, slug: makeSlug(fields.title, fields.luma_event_id), description: description ?? "" });
        result.created++;
      }
    } catch (error) {
      result.errors++;
      if (existing) {
        const message = error instanceof Error ? error.message : "unknown error";
        await store.markError(fields.luma_event_id, message).catch(() => {});
      }
    }
  }

  // 3. Only now that the whole listing was read: events no longer there (or no longer public) are marked removed.
  const gone = stored.filter((row) => !row.removed_from_luma && !seen.has(row.luma_event_id)).map((row) => row.luma_event_id);
  if (gone.length > 0) {
    await store.markRemoved(gone);
    result.removed = gone.length;
  }

  return result;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run src/lib/luma/sync.test.ts`
Expected: PASS (10 tests).

---

### Task 5: Supabase store, cron route, schedule, local env

**Files:**
- Create: `src/lib/supabase/admin.ts`, `src/lib/events/store.ts`, `src/app/api/cron/luma-sync/route.ts`, `vercel.json`
- Modify: `scripts/dev-env.sh`
- Test: `src/app/api/cron/luma-sync/route.test.ts`

**Consumes:** `runSync`, `EventStore` (Task 4), `createLumaClient` (Task 3).
**Produces:** `GET /api/cron/luma-sync`, `createAdminClient()`, `createEventStore(db)`.

- [ ] **Step 1: Write the failing route test**

`src/app/api/cron/luma-sync/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const runSync = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/luma/sync", () => ({ runSync }));
vi.mock("@/lib/luma/client", () => ({ createLumaClient: vi.fn(() => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/events/store", () => ({ createEventStore: vi.fn(() => ({})) }));

const { GET } = await import("./route");

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/luma-sync", { headers: authorization ? { authorization } : {} });

describe("GET /api/cron/luma-sync", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("LUMA_API_KEY", "luma-key");
    runSync.mockReset();
    revalidateTag.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("answers 500 and does nothing when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(runSync).not.toHaveBeenCalled();
  });

  it("answers 401 without the header or with a wrong one, and does nothing", async () => {
    for (const header of [undefined, "Bearer wrong", "s3cret", "Bearer s3cret2"]) {
      const res = await GET(request(header));
      expect(res.status).toBe(401);
    }
    expect(runSync).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 500 and does nothing when LUMA_API_KEY is not set", async () => {
    vi.stubEnv("LUMA_API_KEY", "");
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(runSync).not.toHaveBeenCalled();
  });

  it("runs the sync, refreshes the events cache and returns the counts", async () => {
    runSync.mockResolvedValue({ created: 2, updated: 1, removed: 0, errors: 0 });
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: 2, updated: 1, removed: 0, errors: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("events", "max");
  });

  it("answers 502 with no details and does not refresh the cache when the sync throws", async () => {
    runSync.mockRejectedValue(new Error("Luma request failed with luma-key inside"));
    const res = await GET(request("Bearer s3cret"));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("luma-key");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/api/cron/luma-sync/route.test.ts`
Expected: FAIL (cannot find `./route`).

- [ ] **Step 3: Write the admin client and the store**

`src/lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses row-level security. Server code only; never import it from a client component.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
```

`src/lib/events/store.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventStore } from "@/lib/luma/sync";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function createEventStore(db: SupabaseClient): EventStore {
  const synced = () => ({
    removed_from_luma: false,
    luma_synced_at: new Date().toISOString(),
    luma_sync_status: "ok",
    luma_sync_error: null,
  });

  return {
    async listStored() {
      const { data, error } = await db.from("events").select("luma_event_id, start_at, end_at, removed_from_luma");
      fail(error);
      return data ?? [];
    },
    async insert(row) {
      fail((await db.from("events").insert({ ...row, ...synced() })).error);
    },
    async update(lumaId, fields) {
      fail((await db.from("events").update({ ...fields, ...synced() }).eq("luma_event_id", lumaId)).error);
    },
    async markError(lumaId, message) {
      fail(
        (await db.from("events").update({ luma_sync_status: "error", luma_sync_error: message.slice(0, 500) }).eq("luma_event_id", lumaId))
          .error,
      );
    },
    async markRemoved(lumaIds) {
      fail((await db.from("events").update({ removed_from_luma: true }).in("luma_event_id", lumaIds)).error);
    },
  };
}
```

- [ ] **Step 4: Write the route and the schedule**

`src/app/api/cron/luma-sync/route.ts`:

```ts
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { createEventStore } from "@/lib/events/store";
import { createLumaClient } from "@/lib/luma/client";
import { runSync } from "@/lib/luma/sync";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 500 });
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) return Response.json({ error: "not configured" }, { status: 500 });

  try {
    const result = await runSync(createLumaClient({ apiKey }), createEventStore(createAdminClient()));
    revalidateTag("events", "max");
    return Response.json(result);
  } catch (error) {
    // Log the kind of failure only; messages could carry request details.
    console.error("luma-sync failed:", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "sync failed" }, { status: 502 });
  }
}
```

`vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/luma-sync", "schedule": "0 * * * *" }]
}
```

- [ ] **Step 5: Local env**

Edit `scripts/dev-env.sh`: add two lines inside the heredoc, after the publishable key line:

```
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
CRON_SECRET=local-cron-secret
```

The owner's `LUMA_API_KEY` goes in `.env.development.local` (not written by this script, so it is not overwritten).
Verify it is git-ignored: `git check-ignore -v .env.development.local` must print a `.gitignore` rule.

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npx vitest run src/app/api/cron/luma-sync/route.test.ts`
Expected: PASS (5 tests).

---

### Task 6: Public reads and display helpers

**Files:**
- Create: `src/lib/events/types.ts`, `src/lib/events/split.ts`, `src/lib/events/format.ts`, `src/lib/events/queries.ts`
- Test: `src/lib/events/split.test.ts`, `src/lib/events/format.test.ts`

**Produces:**

```ts
export type PublicEvent = {
  slug: string; title: string; description: string;
  start_at: string; end_at: string | null; timezone: string; location_type: string;
  venue_name: string | null; venue_city: string | null; venue_address: string | null;
  cover_url: string | null; luma_url: string;
};
export function splitEvents(events: PublicEvent[], now: Date): { upcoming: PublicEvent[]; past: PublicEvent[] };
export function formatEventTime(startIso: string, endIso: string | null, timeZone: string): string;
export function venueLabel(e: Pick<PublicEvent, "location_type" | "venue_name" | "venue_city">): string | null;
export function getVisibleEvents(): Promise<PublicEvent[]>;      // cached, tag "events"
export function getEvent(slug: string): Promise<PublicEvent | null>; // cached, tag "events"
```

- [ ] **Step 1: Types**

`src/lib/events/types.ts`:

```ts
export type PublicEvent = {
  slug: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  location_type: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_address: string | null;
  cover_url: string | null;
  luma_url: string;
};
```

- [ ] **Step 2: Write the failing tests**

`src/lib/events/split.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { splitEvents } from "./split";
import type { PublicEvent } from "./types";

const NOW = new Date("2026-11-10T12:00:00.000Z");

const ev = (slug: string, start: string, end: string | null): PublicEvent => ({
  slug, title: slug, description: "", start_at: start, end_at: end, timezone: "UTC", location_type: "offline",
  venue_name: null, venue_city: null, venue_address: null, cover_url: null, luma_url: "https://luma.com/x",
});

describe("splitEvents", () => {
  it("puts events that have not ended in upcoming, soonest first, and the rest in past, most recent first", () => {
    const { upcoming, past } = splitEvents(
      [
        ev("later", "2026-12-01T10:00:00Z", "2026-12-01T12:00:00Z"),
        ev("old", "2026-09-01T10:00:00Z", "2026-09-01T12:00:00Z"),
        ev("soon", "2026-11-11T10:00:00Z", "2026-11-11T12:00:00Z"),
        ev("older", "2026-08-01T10:00:00Z", "2026-08-01T12:00:00Z"),
      ],
      NOW,
    );
    expect(upcoming.map((e) => e.slug)).toEqual(["soon", "later"]);
    expect(past.map((e) => e.slug)).toEqual(["old", "older"]);
  });

  it("keeps an event that started but has not ended in upcoming", () => {
    const { upcoming, past } = splitEvents([ev("now", "2026-11-10T10:00:00Z", "2026-11-10T14:00:00Z")], NOW);
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });

  it("uses the start time when there is no end time", () => {
    const { upcoming, past } = splitEvents([ev("a", "2026-11-09T10:00:00Z", null), ev("b", "2026-11-11T10:00:00Z", null)], NOW);
    expect(upcoming.map((e) => e.slug)).toEqual(["b"]);
    expect(past.map((e) => e.slug)).toEqual(["a"]);
  });
});
```

`src/lib/events/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatEventTime, venueLabel } from "./format";

describe("formatEventTime", () => {
  it("shows the day once and a time range in the event's own time zone", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", "2026-11-07T04:00:00Z", "America/Los_Angeles")).toBe(
      "Fri, Nov 6, 2026 · 6:00 PM – 8:00 PM PST",
    );
  });

  it("shows both days when the event crosses midnight", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", "2026-11-07T10:00:00Z", "America/Los_Angeles")).toBe(
      "Fri, Nov 6, 2026, 6:00 PM – Sat, Nov 7, 2026, 2:00 AM PST",
    );
  });

  it("shows only the start when there is no end", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", null, "America/Los_Angeles")).toBe("Fri, Nov 6, 2026 · 6:00 PM PST");
  });

  it("falls back to UTC for an unknown time zone", () => {
    expect(formatEventTime("2026-11-07T02:00:00Z", null, "Not/AZone")).toBe("Sat, Nov 7, 2026 · 2:00 AM UTC");
  });
});

describe("venueLabel", () => {
  it("joins venue name and city for in-person events", () => {
    expect(venueLabel({ location_type: "offline", venue_name: "Frontier Tower", venue_city: "San Francisco" })).toBe(
      "Frontier Tower, San Francisco",
    );
  });
  it("uses just the city when the name is hidden", () => {
    expect(venueLabel({ location_type: "offline", venue_name: null, venue_city: "San Francisco" })).toBe("San Francisco");
  });
  it("says Online for online events", () => {
    for (const type of ["zoom", "meet", "youtube", "twitch", "twitter", "discord"]) {
      expect(venueLabel({ location_type: type, venue_name: null, venue_city: null })).toBe("Online");
    }
  });
  it("is null when nothing is known", () => {
    expect(venueLabel({ location_type: "missing", venue_name: null, venue_city: null })).toBeNull();
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/lib/events`
Expected: FAIL (cannot find `./split` and `./format`).

- [ ] **Step 4: Write the helpers**

`src/lib/events/split.ts`:

```ts
import type { PublicEvent } from "./types";

export function splitEvents(events: PublicEvent[], now: Date): { upcoming: PublicEvent[]; past: PublicEvent[] } {
  const upcoming: PublicEvent[] = [];
  const past: PublicEvent[] = [];
  for (const event of events) {
    (new Date(event.end_at ?? event.start_at) >= now ? upcoming : past).push(event);
  }
  upcoming.sort((a, b) => a.start_at.localeCompare(b.start_at));
  past.sort((a, b) => b.start_at.localeCompare(a.start_at));
  return { upcoming, past };
}
```

`src/lib/events/format.ts`:

```ts
import type { PublicEvent } from "./types";

const ONLINE_TYPES = new Set(["zoom", "meet", "youtube", "twitch", "twitter", "discord"]);

function parts(date: Date, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" });
  // Newer ICU versions put a narrow no-break space before AM/PM; normalise it to a plain space.
  const clean = (s: string) => s.replace(/[  ]/g, " ");
  return {
    day: clean(day.format(date)),
    time: clean(time.format(date)),
    zone: zone.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "",
  };
}

export function formatEventTime(startIso: string, endIso: string | null, timeZone: string): string {
  let zoneName = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    zoneName = "UTC";
  }
  const start = parts(new Date(startIso), zoneName);
  if (!endIso) return `${start.day} · ${start.time} ${start.zone}`;
  const end = parts(new Date(endIso), zoneName);
  if (start.day === end.day) return `${start.day} · ${start.time} – ${end.time} ${start.zone}`;
  return `${start.day}, ${start.time} – ${end.day}, ${end.time} ${start.zone}`;
}

export function venueLabel(e: Pick<PublicEvent, "location_type" | "venue_name" | "venue_city">): string | null {
  if (ONLINE_TYPES.has(e.location_type)) return "Online";
  return [e.venue_name, e.venue_city].filter(Boolean).join(", ") || null;
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run src/lib/events`
Expected: PASS (11 tests). If a time-zone abbreviation differs on this machine's ICU build, fix the helper, not the expected text.

- [ ] **Step 6: Write the cached reads** (no unit test: they only wrap Supabase; covered by Task 8 browser QA)

`src/lib/events/queries.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseEnv } from "@/lib/supabase/env";
import type { PublicEvent } from "./types";

const COLUMNS =
  "slug, title, description, start_at, end_at, timezone, location_type, venue_name, venue_city, venue_address, cover_url, luma_url";

// Public data, read with the publishable key and no cookies so the result can be cached for everyone.
// Row-level security already limits this to published, visible events.
function anonClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getVisibleEvents(): Promise<PublicEvent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const { data, error } = await anonClient().from("events").select(COLUMNS);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEvent(slug: string): Promise<PublicEvent | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const { data, error } = await anonClient().from("events").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
```

---

### Task 7: Pages, header link and copy

**Files:**
- Create: `src/components/event-card.tsx`, `src/app/events/page.tsx`, `src/app/events/[slug]/page.tsx`
- Modify: `src/lib/copy.ts`, `src/components/site-header.tsx`
- Check first: `src/lib/copy.test.ts` (see what it asserts about `copy` before adding keys)

- [ ] **Step 1: Copy**

In `src/lib/copy.ts`: add `events: "Events"` to `nav`, and a new `events` block after `profile`:

```ts
  events: {
    title: "Events",
    upcoming: "Upcoming",
    past: "Past",
    emptyUpcoming: "No upcoming events.",
    emptyPast: "No past events.",
    loading: "Loading events…",
    getTickets: "Get tickets",
    allEvents: "All events",
    notFoundTitle: "Event not found",
    cover: "Event cover image",
  },
```

- [ ] **Step 2: Header link**

In `src/components/site-header.tsx` replace the site-name link with:

```tsx
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold">{copy.siteName}</Link>
        <Link href="/events">{copy.nav.events}</Link>
      </div>
```

- [ ] **Step 3: Event card**

`src/components/event-card.tsx`:

```tsx
import Link from "next/link";
import { formatEventTime, venueLabel } from "@/lib/events/format";
import type { PublicEvent } from "@/lib/events/types";
import { copy } from "@/lib/copy";

export function EventCard({ event }: { event: PublicEvent }) {
  const venue = venueLabel(event);
  return (
    <li>
      <Link href={`/events/${event.slug}`} className="flex gap-4 rounded border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
        {event.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element -- Luma-hosted image; no image optimizer configured
          <img src={event.cover_url} alt={copy.events.cover} loading="lazy" className="h-24 w-24 flex-none rounded object-cover" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-semibold">{event.title}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatEventTime(event.start_at, event.end_at, event.timezone)}</p>
          {venue && <p className="text-sm text-zinc-600 dark:text-zinc-400">{venue}</p>}
        </div>
      </Link>
    </li>
  );
}
```

- [ ] **Step 4: `/events`**

`src/app/events/page.tsx`:

```tsx
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EventCard } from "@/components/event-card";
import { copy } from "@/lib/copy";
import { getVisibleEvents } from "@/lib/events/queries";
import { splitEvents } from "@/lib/events/split";

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">{copy.events.title}</h1>
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <EventsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function EventsContent({ searchParams }: { searchParams: PageProps<"/events">["searchParams"] }) {
  await connection();
  const { tab } = await searchParams;
  const showPast = tab === "past";
  const { upcoming, past } = splitEvents(await getVisibleEvents(), new Date());
  const events = showPast ? past : upcoming;

  const tabClass = (active: boolean) => (active ? "border-b-2 border-black font-semibold dark:border-white" : "text-zinc-600 dark:text-zinc-400");

  return (
    <>
      <nav className="mb-4 flex gap-6">
        <Link href="/events" className={tabClass(!showPast)}>{copy.events.upcoming}</Link>
        <Link href="/events?tab=past" className={tabClass(showPast)}>{copy.events.past}</Link>
      </nav>
      {events.length === 0 ? (
        <p>{showPast ? copy.events.emptyPast : copy.events.emptyUpcoming}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => <EventCard key={event.slug} event={event} />)}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 5: `/events/[slug]`**

`src/app/events/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { getEvent } from "@/lib/events/queries";
import { formatEventTime, venueLabel } from "@/lib/events/format";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: copy.events.notFoundTitle };
  const description = event.description.slice(0, 160) || undefined;
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: event.cover_url ? [event.cover_url] : undefined },
  };
}

export default function EventPage({ params }: PageProps<"/events/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense fallback={<p>{copy.events.loading}</p>}>
        <EventDetail params={params} />
      </Suspense>
    </main>
  );
}

async function EventDetail({ params }: { params: PageProps<"/events/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  const venue = venueLabel(event);

  return (
    <article className="flex flex-col gap-4">
      <Link href="/events" className="text-sm text-zinc-600 dark:text-zinc-400">← {copy.events.allEvents}</Link>
      {event.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element -- Luma-hosted image; no image optimizer configured
        <img src={event.cover_url} alt={copy.events.cover} className="w-full rounded object-cover" />
      )}
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p>{formatEventTime(event.start_at, event.end_at, event.timezone)}</p>
      {venue && <p>{[venue, event.venue_address].filter((v, i, all) => v && all.indexOf(v) === i).join(" · ")}</p>}
      <a
        href={event.luma_url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
      >
        {copy.events.getTickets}
      </a>
      {event.description && <p className="whitespace-pre-line">{event.description}</p>}
    </article>
  );
}
```

- [ ] **Step 6: Check**

Run: `npm run lint && npm test && npm run build`
Expected: lint clean, all unit tests pass, build succeeds with `/events` and `/events/[slug]` listed as partial-prerender or dynamic and **no** Supabase fetch during the build. If `next build` reports runtime data in `generateMetadata`, follow the fix in the `generateMetadata` guide ("With Cache Components") and note it here.

---

### Task 8: Live read-only check, local run, browser QA

- [ ] **Step 1: Owner adds the key locally.** The owner puts `LUMA_API_KEY=...` in `.env.development.local` in this worktree (git-ignored; verified in Task 5 Step 5). Nobody pastes it in chat.
- [ ] **Step 2: Capture the real response shape (read-only).** One `GET` to `/v1/calendars/events/list?pagination_limit=3` with the key loaded from that file, output piped to a script that prints **only the key names and value types**, never values of `submitted_by` or any email. Compare with `types.ts`. Do the same for `GET /v1/events/get` on one event id. Fix `types.ts`/`map.ts` first (with a test) if names differ.
- [ ] **Step 3: Save a fixture.** Write `src/lib/luma/__fixtures__/calendar-list-entry.json` with one real public event reduced to the fields `LumaCalendarEvent` reads (no emails, tags or user ids), and add one mapper test that maps it.
- [ ] **Step 4: Run it for real, into the local database.** `supabase db reset`, `./scripts/dev-env.sh`, `npm run dev`, then
  `curl -s -H "Authorization: Bearer local-cron-secret" localhost:3000/api/cron/luma-sync`.
  Expected JSON: `created` equal to the number of public events on the calendar, `errors: 0`. Run it a second time: `created: 0`, `updated` equal to the count, `errors: 0`. (Reads production Luma with `GET` only; writes only the local database.)
- [ ] **Step 5: Browser QA** with `/browse` against `localhost:3000`: `/events` Upcoming and Past tabs; the empty state (check the tab that is empty, or temporarily hide events with SQL on the local database); a card opens its event page; **Get tickets** opens the Luma page in a new tab; an unknown slug shows not-found; times are in the event's time zone; the page at 375px width; the header Events link when logged out and logged in.
- [ ] **Step 6: Confirm the access rules from the browser side:** `curl localhost:55321/rest/v1/events` with only the publishable key returns events; the same with a `PATCH` returns an error.

---

### Task 9: Final checks and handover

- [ ] **Step 1:** `npm run lint && npm test && npm run test:db && npm run build` all pass.
- [ ] **Step 2:** `git status` shows only intended files; no `.env*`, no API key anywhere: `git grep -n "LUMA_API_KEY" -- . ':!docs'` shows only variable names.
- [ ] **Step 3:** Report to the owner (what was built, what was verified, what the release needs) and wait for "ship it".
- [ ] **Step 4 (after "ship it"):** commit (spec and plan, then code), push, open the PR with `Closes #7`, wait for checks, merge. Then, in order: the owner adds `LUMA_API_KEY` and `CRON_SECRET` in Vercel Production (a fresh random string for `CRON_SECRET`); redeploy; apply the migration to production with the owner's go-ahead (`supabase db push --linked`, which the owner runs); trigger the first sync once by hand with the secret; check `/events` on production; health check; close the issue; remove the worktree and delete the branch.

## Self-review against the spec

- Scope and decisions: Tasks 1-7 build exactly the "In" list; nothing from "Out" appears.
- Data model: every column and constraint in Task 1; `hidden` and `status` are never written by the sync (Task 4 test).
- Access rules: Task 1 tests (anon and member read only visible rows; nobody writes).
- Luma adapter: GET-only guard and the two-path allowlist (Task 3); the key never appears in errors (Task 3, Task 5 tests).
- Sync: description via get-event for new or unfinished events only; removal only after a complete listing; failure writes nothing; one bad event does not stop the run; idempotence (Task 4).
- Cron: secret check, 500 when unconfigured, revalidate on success only (Task 5).
- Pages: tabs by `?tab=past`, empty states, event time zone, Get tickets in a new tab, plain-text description, metadata, not-found, header link, request-time reads (Tasks 6-7).
- Testing and release: unit, database, live read-only check, browser QA, release order (Tasks 8-9).
- Type names used across tasks: `LumaReader`, `EventStore`, `StoredEvent`, `EventFields`, `EventWrite`, `SyncResult`, `PublicEvent`, `getVisibleEvents`, `getEvent`, `splitEvents`, `formatEventTime`, `venueLabel`, `createLumaClient`, `createEventStore`, `createAdminClient`. Each is defined in the task that produces it and used with the same name afterwards.
