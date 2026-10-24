-- Sponsors and speakers shown on the public site and managed by admins. Everyone can read the visible rows; only admins
-- (public.is_admin()) can change anything. Limits and formats are enforced here, not only on the screens. Pictures are
-- stored as a path inside the public bucket `site-images` (never as an address), so only our own files can be shown.
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  tier text not null check (tier in ('platinum', 'gold', 'silver', 'bronze')),
  website_url text check (website_url is null or (website_url ~ '^https://[^[:space:]]+$' and char_length(website_url) <= 200)),
  description text not null default '' check (char_length(description) <= 600),
  logo_path text check (logo_path is null or logo_path ~ '^sponsors/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'),
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  job_title text not null default '' check (char_length(job_title) <= 120),
  company text not null default '' check (char_length(company) <= 100),
  bio text not null default '' check (char_length(bio) <= 1000),
  photo_path text check (photo_path is null or photo_path ~ '^speakers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'),
  linkedin_url text check (linkedin_url is null or (linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/[^[:space:]]*$' and char_length(linkedin_url) <= 200)),
  website_url text check (website_url is null or (website_url ~ '^https://[^[:space:]]+$' and char_length(website_url) <= 200)),
  event_id uuid references public.events (id) on delete set null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index speakers_order_idx on public.speakers (sort_order, name);
create index sponsors_order_idx on public.sponsors (tier, sort_order, name);

-- Only the keys the code knows can exist. The sponsor contact link is an https address or a mailto: address.
create table public.site_settings (
  key text primary key check (key in ('sponsor_contact_url')),
  value text not null check (char_length(value) <= 200 and (value ~ '^https://[^[:space:]]+$' or value ~ '^mailto:[^[:space:]]+@[^[:space:]]+$')),
  updated_at timestamptz not null default now()
);

alter table public.sponsors enable row level security;
alter table public.speakers enable row level security;
alter table public.site_settings enable row level security;

-- Visitors read visible rows; admins read everything (the admin check is only evaluated for signed-in members).
create policy "visitors read visible sponsors" on public.sponsors for select to anon using (visible);
create policy "members read visible sponsors" on public.sponsors for select to authenticated using (visible or public.is_admin());
create policy "admins change sponsors" on public.sponsors for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "visitors read visible speakers" on public.speakers for select to anon using (visible);
create policy "members read visible speakers" on public.speakers for select to authenticated using (visible or public.is_admin());
create policy "admins change speakers" on public.speakers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "everyone reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admins change settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Production grants nothing automatically: reading for everyone, writing for signed-in members (the rules above limit it to admins).
revoke all on public.sponsors, public.speakers, public.site_settings from public, anon, authenticated, service_role;
grant select on public.sponsors, public.speakers, public.site_settings to anon, authenticated;
grant insert, update, delete on public.sponsors, public.speakers, public.site_settings to authenticated;

-- The picture bucket: public to read, 500 KB, JPEG, PNG or WebP only (no SVG: it can carry scripts). Only admins add, see or remove files,
-- and only under sponsors/ or speakers/ with a random name.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 512000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 512000, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "admins add site images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-images' and public.is_admin()
    and name ~ '^(sponsors|speakers)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
  );

-- The Storage API looks an object up before it deletes it, so admins can see these files too.
create policy "admins see site images" on storage.objects
  for select to authenticated using (bucket_id = 'site-images' and public.is_admin());

create policy "admins delete site images" on storage.objects
  for delete to authenticated using (bucket_id = 'site-images' and public.is_admin());
