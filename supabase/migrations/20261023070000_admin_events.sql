-- True when the logged-in user's profile has role = 'admin'. Runs as its owner so it can read profiles.
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

-- Visitors and members read only the public columns; the sync columns stay private.
-- hidden and removed_from_luma are included because the "anyone reads visible events" policy reads them;
-- they are always false for the rows a visitor can see.
revoke select on public.events from anon, authenticated;
grant select (id, slug, title, description, start_at, end_at, timezone, location_type, venue_name, venue_city,
              venue_address, cover_url, luma_url, status, hidden, removed_from_luma, featured, created_at, updated_at)
  on public.events to anon, authenticated;

-- Admins can change only these two columns from the site.
grant update (hidden, featured) on public.events to authenticated;

-- The full rows (including the sync columns) for admins; nothing for anyone else.
create function public.admin_events() returns setof public.events
language sql stable security definer
set search_path = ''
as $$
  select * from public.events where public.is_admin() order by start_at desc
$$;
revoke execute on function public.admin_events() from public, anon;
grant execute on function public.admin_events() to authenticated;
