-- A member's request now carries the event details they checked (read from the page, or typed by hand), so the admin reviews the same
-- details instead of reading the page again. Nothing from #55 is on production yet, so the two functions are simply replaced.
alter table public.event_requests add column details jsonb not null default '{}'::jsonb
  check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 8000);

drop function public.submit_event_request(text, text, text);
create function public.submit_event_request(p_url text, p_host text, p_note text, p_details jsonb)
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
  if p_details is null or jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 8000
     or btrim(coalesce(p_details ->> 'title', '')) = '' then
    raise exception 'bad details' using errcode = '22023';
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
  insert into public.event_requests (requester_id, url, host, note, details) values (uid, p_url, p_host, btrim(coalesce(p_note, '')), p_details)
  returning id into new_id;
  return new_id;
end
$$;

drop function public.admin_event_requests();
create function public.admin_event_requests()
returns table (id uuid, url text, host text, note text, details jsonb, created_at timestamptz, requester_id uuid, requester_name text, requester_company text)
language sql stable security definer
set search_path = ''
as $$
  select r.id, r.url, r.host, r.note, r.details, r.created_at, r.requester_id, p.name, p.company_name
  from public.event_requests r
  join public.profiles p on p.id = r.requester_id
  where r.status = 'pending' and public.is_admin()
  order by r.created_at
$$;

revoke all on function public.submit_event_request(text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.admin_event_requests() from public, anon, authenticated, service_role;
grant execute on function public.submit_event_request(text, text, text, jsonb) to authenticated;
grant execute on function public.admin_event_requests() to authenticated;
