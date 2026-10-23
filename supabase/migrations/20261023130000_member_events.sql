-- The upcoming events a member is attending, for their profile page. Applies the privacy rules itself:
-- only registered rows the member shows in the attendee list, only for a member who is listed in the directory
-- (or the member themselves, or an admin asking), only for events that are published, visible and not over.
create function public.member_events(p_member uuid)
returns table (event_id uuid, slug text, title text, start_at timestamptz, end_at timestamptz, timezone text)
language sql stable security definer
set search_path = ''
as $$
  select e.id, e.slug, e.title, e.start_at, e.end_at, e.timezone
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  join public.profiles p on p.id = r.member_id
  where (select auth.uid()) is not null
    and r.member_id = p_member
    and r.status = 'registered'
    and r.show_in_list
    and (p.id = (select auth.uid()) or public.is_admin() or (p.show_in_directory and p.name <> ''))
    and e.status = 'published'
    and not e.hidden
    and not e.removed_from_luma
    and coalesce(e.end_at, e.start_at) >= now()
  order by e.start_at, e.id
  limit 20
$$;

revoke all on function public.member_events(uuid) from public, anon, authenticated, service_role;
grant execute on function public.member_events(uuid) to authenticated;
