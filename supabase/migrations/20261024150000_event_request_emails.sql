-- Emails for member event requests (#55). Every admin is told when a request arrives, and the member is told how it was decided.
-- These are not optional: no settings checkbox and no Unsubscribe link (the server job skips the preference check for these kinds).
alter table public.notification_events drop constraint notification_events_kind_check;
alter table public.notification_events add constraint notification_events_kind_check
  check (kind in ('connection_request', 'connection_accepted', 'message', 'post', 'event_request', 'event_request_approved', 'event_request_rejected'));

-- A new request is sent to every admin except the person who asked (actor = the member who asked).
create or replace function public.submit_event_request(p_url text, p_host text, p_note text, p_details jsonb)
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
  insert into public.notification_events (recipient_id, kind, actor_id, ref_id)
  select p.id, 'event_request', uid, new_id from public.profiles p where p.role = 'admin' and p.id <> uid;
  return new_id;
end
$$;

-- Rejecting tells the member (actor = the admin who decided).
create or replace function public.admin_reject_event_request(p_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  asked_by uuid;
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) > 300 then
    raise exception 'reason is too long' using errcode = '22001';
  end if;
  update public.event_requests set status = 'rejected', reject_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    decided_by = uid, decided_at = now()
  where id = p_id and status = 'pending'
  returning requester_id into asked_by;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  insert into public.notification_events (recipient_id, kind, actor_id, ref_id) values (asked_by, 'event_request_rejected', uid, p_id);
end
$$;

-- Adding an event from a request approves it and tells the member.
create or replace function public.admin_save_external_event(
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
  asked_by uuid;
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
    if p_request_id is not null then
      update public.event_requests set status = 'approved', event_id = new_id, decided_by = (select auth.uid()), decided_at = now()
      where id = p_request_id and status = 'pending'
      returning requester_id into asked_by;
      if not found then
        raise exception 'request not found' using errcode = 'P0002';
      end if;
      insert into public.notification_events (recipient_id, kind, actor_id, ref_id)
      values (asked_by, 'event_request_approved', (select auth.uid()), p_request_id);
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

-- The server job reads what it needs to write the new emails: the request's title and note, the event's title, or the reason.
create or replace function public.claim_notification_events(p_limit integer)
returns table (
  id uuid, recipient_id uuid, kind text, actor_id uuid, actor_name text, actor_job_title text, actor_company text,
  preview text, created_at timestamptz, attempts integer, kind_enabled_at timestamptz,
  on_requests boolean, on_accepted boolean, on_messages boolean,
  unsubscribe_code text, last_sent_at timestamptz
)
language plpgsql security definer
set search_path = ''
as $$
declare
  ids uuid[];
begin
  with picked as (
    select e.id from public.notification_events e
    where e.status = 'pending' or (e.status = 'sending' and e.claimed_at < now() - interval '10 minutes')
    order by e.created_at
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked
  ), marked as (
    update public.notification_events e set status = 'sending', claimed_at = now()
    from picked where e.id = picked.id
    returning e.id
  )
  select array_agg(marked.id) into ids from marked;

  insert into public.notification_preferences (member_id)
  select distinct e.recipient_id from public.notification_events e where e.id = any(coalesce(ids, '{}'))
  on conflict do nothing;

  return query
  select e.id, e.recipient_id, e.kind, e.actor_id, a.name, a.job_title, a.company_name,
         left(case e.kind
                when 'connection_request' then (select c.note from public.connections c where c.id = e.ref_id)
                when 'connection_accepted' then ''
                when 'event_request' then (select btrim(r.details ->> 'title') || case when r.note <> '' then E'\n' || r.note else '' end
                                           from public.event_requests r where r.id = e.ref_id)
                when 'event_request_approved' then (select ev.title from public.event_requests r join public.events ev on ev.id = r.event_id where r.id = e.ref_id)
                when 'event_request_rejected' then (select coalesce(r.reject_reason, '') from public.event_requests r where r.id = e.ref_id)
                else (select m.body from public.messages m where m.id = e.ref_id)
              end, 200),
         e.created_at, e.attempts,
         case e.kind when 'connection_request' then p.connection_requests_at when 'connection_accepted' then p.connection_accepted_at
                     else p.messages_at end,
         p.connection_requests_at is not null, p.connection_accepted_at is not null, p.messages_at is not null,
         p.unsubscribe_code,
         (select max(s.sent_at) from public.notification_events s
            where s.status = 'sent' and s.kind = e.kind and s.recipient_id = e.recipient_id and s.actor_id = e.actor_id)
  from public.notification_events e
  join public.profiles a on a.id = e.actor_id
  join public.notification_preferences p on p.member_id = e.recipient_id
  where e.id = any(coalesce(ids, '{}'))
  order by e.created_at;
end
$$;

revoke all on function public.submit_event_request(text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.admin_reject_event_request(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean, uuid) from public, anon, authenticated, service_role;
revoke all on function public.claim_notification_events(integer) from public, anon, authenticated, service_role;
grant execute on function public.submit_event_request(text, text, text, jsonb) to authenticated;
grant execute on function public.admin_reject_event_request(uuid, text) to authenticated;
grant execute on function public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean, uuid) to authenticated;
grant execute on function public.claim_notification_events(integer) to service_role;
