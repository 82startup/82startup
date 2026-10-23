-- The member list for admins. security definer because it must read the login email, which lives in the authentication
-- tables and not in profiles. It returns rows only when the caller is an admin, and nothing to anyone else.
-- The search text is trimmed, cut at 80 characters and matched literally (a % or _ typed by the admin is not a wildcard).
create function public.admin_members(p_query text, p_limit integer, p_offset integer)
returns table (
  id uuid,
  name text,
  email text,
  role public.member_role,
  member_type public.member_type,
  directory text,
  joined_at timestamptz,
  last_sign_in_at timestamptz,
  total bigint
)
language sql stable security definer
set search_path = ''
as $$
  with q as (
    select case
      when coalesce(btrim(p_query), '') = '' then null
      else '%' || replace(replace(replace(left(btrim(p_query), 80), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    end as pattern
  ),
  m as (
    select p.id, p.name, u.email::text as email, p.role, p.member_type,
           case
             when not p.show_in_directory then 'no'
             when p.name = '' then 'no-name'
             else 'yes'
           end as directory,
           u.created_at as joined_at,
           u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id, q
    where public.is_admin()
      and (q.pattern is null or p.name ilike q.pattern or u.email ilike q.pattern)
  )
  select m.id, m.name, m.email, m.role, m.member_type, m.directory, m.joined_at, m.last_sign_in_at, count(*) over () as total
  from m
  order by m.joined_at desc, m.id
  limit least(greatest(coalesce(p_limit, 0), 0), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke all on function public.admin_members(text, integer, integer) from public, anon, authenticated, service_role;
grant execute on function public.admin_members(text, integer, integer) to authenticated;
