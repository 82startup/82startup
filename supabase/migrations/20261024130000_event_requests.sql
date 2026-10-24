-- Members can ask for an event by link; admins approve or reject. Closed table: only the functions below read or write it.
create table public.event_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  url text not null check (char_length(url) <= 500),
  host text not null check (char_length(host) <= 200),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 300),
  event_id uuid references public.events (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index event_requests_pending_url_key on public.event_requests (url) where status = 'pending';
create index event_requests_requester_idx on public.event_requests (requester_id, created_at desc);
alter table public.event_requests enable row level security;
revoke all on public.event_requests from public, anon, authenticated, service_role;

-- A member asks for an event. Limits: 3 waiting, 10 per day. Messages tell the app which refusal it was.
create function public.submit_event_request(p_url text, p_host text, p_note text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_id uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not coalesce(public.profile_is_complete(), false) then
    raise exception 'profile not complete' using errcode = '42501';
  end if;
  if p_url is null or p_url !~ '^https://' or char_length(p_url) > 500 or p_host is null or char_length(p_host) > 200 then
    raise exception 'bad link' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) > 300 then
    raise exception 'note is too long' using errcode = '22001';
  end if;
  if (select count(*) from public.event_requests r where r.requester_id = uid and r.status = 'pending') >= 3 then
    raise exception 'too many waiting' using errcode = 'P0001';
  end if;
  if (select count(*) from public.event_requests r where r.requester_id = uid and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many today' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.events e where e.luma_url = p_url or e.external_url = p_url) then
    raise exception 'already on the site' using errcode = '23505';
  end if;
  if exists (select 1 from public.event_requests r where r.url = p_url and r.status = 'pending') then
    raise exception 'already requested' using errcode = '23505';
  end if;
  insert into public.event_requests (requester_id, url, host, note) values (uid, p_url, p_host, btrim(coalesce(p_note, '')))
  returning id into new_id;
  return new_id;
end
$$;

-- A member's own requests, newest first, with the page address of the event once approved.
create function public.my_event_requests()
returns table (id uuid, url text, host text, note text, status text, reject_reason text, event_slug text, created_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select r.id, r.url, r.host, r.note, r.status, r.reject_reason, e.slug, r.created_at
  from public.event_requests r
  left join public.events e on e.id = r.event_id
  where r.requester_id = (select auth.uid())
  order by r.created_at desc
  limit 50
$$;

create function public.withdraw_event_request(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.event_requests where id = p_id and requester_id = (select auth.uid()) and status = 'pending';
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
end
$$;

-- Admins: the waiting requests (oldest first), who asked, and how many wait.
create function public.admin_event_requests()
returns table (id uuid, url text, host text, note text, created_at timestamptz, requester_id uuid, requester_name text, requester_company text)
language sql stable security definer
set search_path = ''
as $$
  select r.id, r.url, r.host, r.note, r.created_at, r.requester_id, p.name, p.company_name
  from public.event_requests r
  join public.profiles p on p.id = r.requester_id
  where r.status = 'pending' and public.is_admin()
  order by r.created_at
$$;

create function public.admin_pending_event_request_count()
returns integer
language sql stable security definer
set search_path = ''
as $$
  select case when public.is_admin() then (select count(*)::integer from public.event_requests where status = 'pending') else 0 end
$$;

create function public.admin_reject_event_request(p_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) > 300 then
    raise exception 'reason is too long' using errcode = '22001';
  end if;
  update public.event_requests set status = 'rejected', reject_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    decided_by = (select auth.uid()), decided_at = now()
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
end
$$;

-- The admin save function gets one more optional argument: the request this event answers.
drop function public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean);

create function public.admin_save_external_event(
  p_id uuid, p_slug text, p_title text, p_description text, p_start_at timestamptz, p_end_at timestamptz, p_timezone text,
  p_location_type text, p_venue_name text, p_venue_city text, p_venue_address text, p_cover_url text,
  p_external_url text, p_external_host text, p_hidden boolean, p_request_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'unknown timezone' using errcode = '22023';
  end if;
  if p_end_at is not null and p_end_at < p_start_at then
    raise exception 'the end is before the start' using errcode = '22023';
  end if;
  if p_location_type not in ('online', 'offline', 'unknown') then
    raise exception 'unknown location type' using errcode = '22023';
  end if;

  if p_id is null then
    if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 100 then
      raise exception 'bad page address' using errcode = '22023';
    end if;
    insert into public.events (source, slug, title, description, start_at, end_at, timezone, location_type, venue_name, venue_city,
                               venue_address, cover_url, luma_url, external_url, external_host, hidden)
    values ('external', p_slug, btrim(p_title), coalesce(p_description, ''), p_start_at, p_end_at, p_timezone, p_location_type,
            nullif(btrim(coalesce(p_venue_name, '')), ''), nullif(btrim(coalesce(p_venue_city, '')), ''), nullif(btrim(coalesce(p_venue_address, '')), ''),
            p_cover_url, p_external_url, p_external_url, p_external_host, coalesce(p_hidden, false))
    returning id into new_id;
    -- Adding an event from a member's request approves that request in the same step.
    if p_request_id is not null then
      update public.event_requests set status = 'approved', event_id = new_id, decided_by = (select auth.uid()), decided_at = now()
      where id = p_request_id and status = 'pending';
      if not found then
        raise exception 'request not found' using errcode = 'P0002';
      end if;
    end if;
    return new_id;
  end if;

  update public.events set
    title = btrim(p_title), description = coalesce(p_description, ''), start_at = p_start_at, end_at = p_end_at, timezone = p_timezone,
    location_type = p_location_type, venue_name = nullif(btrim(coalesce(p_venue_name, '')), ''), venue_city = nullif(btrim(coalesce(p_venue_city, '')), ''),
    venue_address = nullif(btrim(coalesce(p_venue_address, '')), ''), cover_url = p_cover_url, luma_url = p_external_url,
    external_url = p_external_url, external_host = p_external_host, hidden = coalesce(p_hidden, false)
  where id = p_id and source = 'external'
  returning id into new_id;
  if new_id is null then
    raise exception 'external event not found' using errcode = 'P0002';
  end if;
  return new_id;
end
$$;


revoke all on function public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean, uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean, uuid) to authenticated;
revoke all on function public.submit_event_request(text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.my_event_requests() from public, anon, authenticated, service_role;
revoke all on function public.withdraw_event_request(uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_event_requests() from public, anon, authenticated, service_role;
revoke all on function public.admin_pending_event_request_count() from public, anon, authenticated, service_role;
revoke all on function public.admin_reject_event_request(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.submit_event_request(text, text, text) to authenticated;
grant execute on function public.my_event_requests() to authenticated;
grant execute on function public.withdraw_event_request(uuid) to authenticated;
grant execute on function public.admin_event_requests() to authenticated;
grant execute on function public.admin_pending_event_request_count() to authenticated;
grant execute on function public.admin_reject_event_request(uuid, text) to authenticated;
