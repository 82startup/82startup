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
