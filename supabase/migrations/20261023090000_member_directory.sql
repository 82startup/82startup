-- A member can leave the member directory. An empty profile (no name) is never listed.
alter table public.profiles add column show_in_directory boolean not null default true;

-- Members read a profile only when it is listed, when it is their own, or when they are an admin.
-- This replaces "members read all profiles", so the switch is enforced here and not only on the screens.
drop policy "members read all profiles" on public.profiles;
create policy "members read listed profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (show_in_directory and name <> '') or public.is_admin());

-- Members read only the public columns. The role column (who is an admin) stays private.
revoke select on public.profiles from authenticated;
grant select (id, name, avatar_url, job_title, company_name, company_website, bio, linkedin_url, member_type,
              show_in_directory, created_at, updated_at)
  on public.profiles to authenticated;

grant update (show_in_directory) on public.profiles to authenticated;

-- The directory search. Runs with the caller's rights (so the row policy applies) and also applies the listed rule
-- itself, so a member's own hidden profile does not show in their own directory. A % or _ typed by a user is literal.
create function public.search_members(p_query text, p_type public.member_type, p_limit integer, p_offset integer)
returns table (
  id uuid,
  name text,
  avatar_url text,
  job_title text,
  company_name text,
  member_type public.member_type,
  total bigint
)
language sql stable
set search_path = ''
as $$
  with q as (
    select case
      when coalesce(btrim(p_query), '') = '' then null
      else '%' || replace(replace(replace(left(btrim(p_query), 80), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    end as pattern
  ),
  m as (
    select p.id, p.name, p.avatar_url, p.job_title, p.company_name, p.member_type
    from public.profiles p, q
    where p.show_in_directory
      and p.name <> ''
      and (p_type is null or p.member_type = p_type)
      and (q.pattern is null or p.name ilike q.pattern or p.company_name ilike q.pattern)
  )
  select m.id, m.name, m.avatar_url, m.job_title, m.company_name, m.member_type, count(*) over () as total
  from m
  order by lower(m.name), m.id
  limit least(greatest(coalesce(p_limit, 0), 0), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke all on function public.search_members(text, public.member_type, integer, integer) from public, anon, authenticated, service_role;
grant execute on function public.search_members(text, public.member_type, integer, integer) to authenticated;

-- Leaving the directory also removes the member from every attendee list (the counts stay). Same function as before
-- with one more rule; its grants are unchanged.
create or replace function public.event_attendees(p_event uuid)
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
    and p.show_in_directory
    and p.name <> ''
    and (public.is_admin() or (e.status = 'published' and not e.hidden and not e.removed_from_luma))
  order by lower(p.name), p.id
$$;
