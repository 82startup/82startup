create type public.registration_status as enum ('registered', 'cancelled');
create type public.registration_source as enum ('luma', 'self');

-- One row per event and member. Closed: everything goes through the functions below.
create table public.event_registrations (
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  status public.registration_status not null default 'registered',
  source public.registration_source not null,
  show_in_list boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

alter table public.event_registrations enable row level security;

create trigger event_registrations_set_updated_at
before update on public.event_registrations
for each row execute function public.set_updated_at();

revoke all on public.event_registrations from anon, authenticated;

-- How many people Luma says are going (includes people who are not members). Not in the public column grant.
alter table public.events add column luma_approved_count integer not null default 0 check (luma_approved_count >= 0);

-- Total for everyone; the Luma / self split only for admins. Only for events the caller may see.
create function public.event_attendance(p_event uuid)
returns table (total integer, luma integer, self integer)
language sql stable security definer
set search_path = ''
as $$
  select
    e.luma_approved_count + s.n,
    case when public.is_admin() then e.luma_approved_count end,
    case when public.is_admin() then s.n end
  from public.events e
  cross join lateral (
    select count(*)::integer as n
    from public.event_registrations r
    where r.event_id = e.id and r.source = 'self' and r.status = 'registered'
  ) s
  where e.id = p_event
    and (public.is_admin() or (e.status = 'published' and not e.hidden and not e.removed_from_luma))
$$;

-- The members-only list: registered members who have not hidden themselves.
create function public.event_attendees(p_event uuid)
returns table (member_id uuid, name text, job_title text, company_name text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.name, p.job_title, p.company_name
  from public.event_registrations r
  join public.profiles p on p.id = r.member_id
  join public.events e on e.id = r.event_id
  where (select auth.uid()) is not null
    and r.event_id = p_event
    and r.status = 'registered'
    and r.show_in_list
    and (public.is_admin() or (e.status = 'published' and not e.hidden and not e.removed_from_luma))
  order by lower(p.name), p.id
$$;

create function public.my_attendance(p_event uuid)
returns table (status public.registration_status, source public.registration_source, show_in_list boolean)
language sql stable security definer
set search_path = ''
as $$
  select r.status, r.source, r.show_in_list
  from public.event_registrations r
  where r.event_id = p_event and r.member_id = (select auth.uid())
$$;

-- Marks or cancels the caller. Only for open events. A Luma registration is never changed here.
create function public.set_attendance(p_event uuid, p_attending boolean)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  reg public.event_registrations;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.events e
    where e.id = p_event and e.status = 'published' and not e.hidden and not e.removed_from_luma
      and coalesce(e.end_at, e.start_at) >= now()
  ) then
    raise exception 'event is not open' using errcode = 'P0002';
  end if;

  select * into reg from public.event_registrations where event_id = p_event and member_id = uid;

  if p_attending then
    if not found then
      insert into public.event_registrations (event_id, member_id, status, source) values (p_event, uid, 'registered', 'self');
    elsif reg.status = 'cancelled' then
      update public.event_registrations set status = 'registered', source = 'self' where event_id = p_event and member_id = uid;
    end if;
  elsif found and reg.source = 'self' and reg.status = 'registered' then
    update public.event_registrations set status = 'cancelled' where event_id = p_event and member_id = uid;
  end if;

  return coalesce((select r.status::text from public.event_registrations r where r.event_id = p_event and r.member_id = uid), 'cancelled');
end
$$;

create function public.set_list_visibility(p_event uuid, p_show boolean)
returns void
language sql security definer
set search_path = ''
as $$
  update public.event_registrations set show_in_list = p_show
  where event_id = p_event and member_id = (select auth.uid())
$$;

-- Called by the hourly sync with the emails Luma lists as approved. Matches them to accounts and stores only the
-- member link (never an email). Members Luma no longer lists are cancelled, so only call it after a complete read.
create function public.sync_luma_attendees(p_luma_event_id text, p_emails text[])
returns table (matched integer, cancelled integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  eid uuid;
  wanted uuid[];
  m integer := 0;
  c integer := 0;
begin
  select id into eid from public.events where luma_event_id = p_luma_event_id;
  if eid is null then
    return query select 0, 0;
    return;
  end if;

  select coalesce(array_agg(u.id), '{}'::uuid[]) into wanted
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = any (array(select lower(btrim(x)) from unnest(coalesce(p_emails, '{}'::text[])) x));

  with up as (
    insert into public.event_registrations (event_id, member_id, status, source)
    select eid, w, 'registered', 'luma' from unnest(wanted) w
    on conflict (event_id, member_id) do update set status = 'registered', source = 'luma'
    returning 1
  )
  select count(*) into m from up;

  with gone as (
    update public.event_registrations r set status = 'cancelled'
    where r.event_id = eid and r.source = 'luma' and r.status = 'registered' and not (r.member_id = any (wanted))
    returning 1
  )
  select count(*) into c from gone;

  return query select m, c;
end
$$;

-- Luma and self counts for every event, for the admin list.
create function public.admin_attendance()
returns table (event_id uuid, luma integer, self integer)
language sql stable security definer
set search_path = ''
as $$
  select e.id, e.luma_approved_count,
         (select count(*)::integer from public.event_registrations r
          where r.event_id = e.id and r.source = 'self' and r.status = 'registered')
  from public.events e
  where public.is_admin()
$$;

-- Production grants nothing by default: take everything away, then give back exactly what each function needs.
revoke all on function public.event_attendance(uuid) from public, anon, authenticated, service_role;
revoke all on function public.event_attendees(uuid) from public, anon, authenticated, service_role;
revoke all on function public.my_attendance(uuid) from public, anon, authenticated, service_role;
revoke all on function public.set_attendance(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.set_list_visibility(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.sync_luma_attendees(text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.admin_attendance() from public, anon, authenticated, service_role;

grant execute on function public.event_attendance(uuid) to anon, authenticated;
grant execute on function public.event_attendees(uuid) to authenticated;
grant execute on function public.my_attendance(uuid) to authenticated;
grant execute on function public.set_attendance(uuid, boolean) to authenticated;
grant execute on function public.set_list_visibility(uuid, boolean) to authenticated;
grant execute on function public.admin_attendance() to authenticated;
grant execute on function public.sync_luma_attendees(text, text[]) to service_role;
