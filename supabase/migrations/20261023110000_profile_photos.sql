-- Profile photos live in a public bucket under a long random name. The bucket itself refuses anything over 200 KB or that
-- is not a JPEG, so a modified browser cannot store more than the page would.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 204800, allowed_mime_types = array['image/jpeg'];

-- A member may add, see and delete only <their account id>/<random uuid>.jpg. Nobody can overwrite (no update rule) and no one can
-- list anyone else's files. Reading a photo by its address needs no rule: the bucket is public for reading.
create policy "members add their own avatars" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  );

-- The Storage API looks an object up before it deletes it, so a member needs to be able to see their own files (and only those).
-- Reading a photo by its address needs no rule; this one does not let anyone see another member's files.
create policy "members see their own avatars" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  );

create policy "members delete their own avatars" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  );

-- The attendee list also returns each member's picture address. A function's returned columns cannot change in place,
-- so it is dropped and created again, with the same rules as before and its grants given again.
drop function public.event_attendees(uuid);

create function public.event_attendees(p_event uuid)
returns table (member_id uuid, name text, job_title text, company_name text, avatar_url text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.name, p.job_title, p.company_name, p.avatar_url
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
