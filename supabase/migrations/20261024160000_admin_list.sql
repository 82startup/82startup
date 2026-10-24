-- The list of admins for the Admins page. security definer because it reads the login email (authentication tables).
-- Returns rows only when the caller is an admin, and nothing to anyone else.
create function public.admin_list_admins()
returns table (id uuid, name text, email text, joined_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.name, u.email::text, u.created_at, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'admin' and public.is_admin()
  order by u.created_at, p.id
$$;

revoke all on function public.admin_list_admins() from public, anon, authenticated, service_role;
grant execute on function public.admin_list_admins() to authenticated;
