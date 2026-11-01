-- Profile pictures of the members who most recently said they are attending an event, for the public Summit timeline.
-- Only pictures leave the database (no names, ids or jobs), and only of members who are listed both in the attendee
-- list and in the member directory. A member without a picture appears as an empty row, drawn as a neutral silhouette.
create function public.event_attendee_faces(p_event uuid)
returns table (avatar_url text)
language sql stable security definer
set search_path = ''
as $$
  select nullif(p.avatar_url, '')
  from public.event_registrations r
  join public.profiles p on p.id = r.member_id
  join public.events e on e.id = r.event_id
  where r.event_id = p_event
    and r.status = 'registered'
    and r.show_in_list
    and p.show_in_directory
    and p.name <> ''
    and e.status = 'published' and not e.hidden and not e.removed_from_luma
  order by r.created_at desc, r.member_id
  limit 10
$$;

revoke all on function public.event_attendee_faces(uuid) from public, anon, authenticated, service_role;
grant execute on function public.event_attendee_faces(uuid) to anon, authenticated;

-- The event page shows attendees as the same cards as the member directory, which carry the member type tag.
-- Same rules as before (members only, listed attendees who are in the directory); only member_type is added.
drop function public.event_attendees(uuid);

create function public.event_attendees(p_event uuid)
returns table (member_id uuid, name text, job_title text, company_name text, avatar_url text, member_type public.member_type)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.name, p.job_title, p.company_name, p.avatar_url, p.member_type
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

revoke all on function public.event_attendees(uuid) from public, anon, authenticated, service_role;
grant execute on function public.event_attendees(uuid) to authenticated;
