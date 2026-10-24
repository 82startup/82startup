-- Email notifications: opt-in settings and a to-send list (outbox). Both tables are closed: members reach their settings only through
-- functions, and only the server job (service role) reads the outbox. Email addresses are never stored here.
create table public.notification_preferences (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  -- Each kind is on when its time is set (the time it was ticked), off when null. Nothing is on by default (opt-in).
  connection_requests_at timestamptz,
  connection_accepted_at timestamptz,
  messages_at timestamptz,
  posts_at timestamptz,
  -- A private random code (about 240 bits) for the Unsubscribe links in emails. It can only turn emails off.
  unsubscribe_code text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('connection_request', 'connection_accepted', 'message', 'post')),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  ref_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz
);
create index notification_events_pending_idx on public.notification_events (created_at) where status in ('pending', 'sending');
create index notification_events_last_sent_idx on public.notification_events (recipient_id, actor_id, kind, sent_at desc) where status = 'sent';
alter table public.notification_events enable row level security;

revoke all on public.notification_preferences, public.notification_events from public, anon, authenticated, service_role;

-- Existing actions now also add a row to the outbox, in the same transaction (so a notification exists exactly when the action happened).
create or replace function public.send_connection_request(p_addressee uuid, p_note text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  note text := btrim(coalesce(p_note, ''));
  existing public.connections;
  new_id uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_addressee = uid then
    raise exception 'cannot connect with yourself' using errcode = '22023';
  end if;
  if char_length(note) > 200 then
    raise exception 'note is too long' using errcode = '22001';
  end if;
  -- Not listed, not found and blocked all look the same, so a block is not revealed.
  if not exists (select 1 from public.profiles p where p.id = p_addressee and p.show_in_directory and p.name <> '')
     or public.is_blocked_either_way(uid, p_addressee) then
    raise exception 'member not available' using errcode = 'P0002';
  end if;

  select * into existing from public.connections c
  where least(c.requester_id, c.addressee_id) = least(uid, p_addressee)
    and greatest(c.requester_id, c.addressee_id) = greatest(uid, p_addressee);

  if found then
    if existing.status = 'accepted' then
      return 'connected';
    elsif existing.status = 'pending' then
      if existing.requester_id = uid then
        return 'pending';
      end if;
      update public.connections set status = 'accepted', responded_at = now() where id = existing.id;
      -- The one who asked first is told it was accepted (not asked again).
      insert into public.notification_events (recipient_id, kind, actor_id, ref_id) values (existing.requester_id, 'connection_accepted', uid, existing.id);
      return 'connected';
    elsif existing.requester_id = uid and existing.responded_at > now() - interval '30 days' then
      raise exception 'wait before asking again' using errcode = 'P0001';
    end if;
    delete from public.connections where id = existing.id;
  end if;

  insert into public.connections (requester_id, addressee_id, note) values (uid, p_addressee, note) returning id into new_id;
  insert into public.notification_events (recipient_id, kind, actor_id, ref_id) values (p_addressee, 'connection_request', uid, new_id);
  return 'pending';
end
$$;

create or replace function public.respond_connection_request(p_id uuid, p_accept boolean)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_status public.connection_status := case when p_accept then 'accepted' else 'declined' end;
  asked_by uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  update public.connections set status = new_status, responded_at = now()
  where id = p_id and addressee_id = uid and status = 'pending'
  returning requester_id into asked_by;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if p_accept then
    insert into public.notification_events (recipient_id, kind, actor_id, ref_id) values (asked_by, 'connection_accepted', uid, p_id);
  end if;
  return new_status::text;
end
$$;

create or replace function public.deliver_message(p_sender uuid, p_recipient uuid, p_body text, p_rate_limited boolean, p_post uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  -- Trim every kind of whitespace at both ends (btrim alone only takes plain spaces).
  text_body text := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');
  new_id uuid;
begin
  if p_sender is null or p_sender = p_recipient then
    raise exception 'cannot message yourself' using errcode = '22023';
  end if;
  if text_body = '' then
    raise exception 'message is empty' using errcode = '22023';
  end if;
  if char_length(text_body) > 2000 then
    raise exception 'message is too long' using errcode = '22001';
  end if;
  if not public.are_connected(p_sender, p_recipient) then
    raise exception 'not connected' using errcode = 'P0002';
  end if;
  if p_rate_limited
     and (select count(*) from public.messages m where m.sender_id = p_sender and m.post_id is null and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many messages' using errcode = 'P0001';
  end if;
  insert into public.messages (sender_id, recipient_id, body, post_id) values (p_sender, p_recipient, text_body, p_post) returning id into new_id;
  insert into public.notification_events (recipient_id, kind, actor_id, ref_id)
  values (p_recipient, case when p_post is null then 'message' else 'post' end, p_sender, new_id);
  return new_id;
end
$$;

-- Members: read and save their own settings.
create function public.my_notification_preferences()
returns table (connection_requests boolean, connection_accepted boolean, messages boolean, posts boolean)
language sql stable security definer
set search_path = ''
as $$
  select coalesce(p.connection_requests_at is not null, false), coalesce(p.connection_accepted_at is not null, false),
         coalesce(p.messages_at is not null, false), coalesce(p.posts_at is not null, false)
  from (select (select auth.uid()) as uid) me
  left join public.notification_preferences p on p.member_id = me.uid
  where me.uid is not null
$$;

-- A kind that stays ticked keeps the time it was first ticked (older events are never emailed after ticking later).
create function public.set_notification_preferences(p_requests boolean, p_accepted boolean, p_messages boolean, p_posts boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.notification_preferences (member_id) values (uid) on conflict do nothing;
  update public.notification_preferences set
    connection_requests_at = case when p_requests then coalesce(connection_requests_at, now()) end,
    connection_accepted_at = case when p_accepted then coalesce(connection_accepted_at, now()) end,
    messages_at = case when p_messages then coalesce(messages_at, now()) end,
    posts_at = case when p_posts then coalesce(posts_at, now()) end,
    updated_at = now()
  where member_id = uid;
end
$$;

-- The server job (service role only).
-- Claims a batch of waiting notifications (marking them as being sent) and returns what is needed to write each email, never an email address.
-- A row stuck in "sending" for 10 minutes is picked up again.
create function public.claim_notification_events(p_limit integer)
returns table (
  id uuid, recipient_id uuid, kind text, actor_id uuid, actor_name text, actor_job_title text, actor_company text,
  preview text, created_at timestamptz, attempts integer, kind_enabled_at timestamptz,
  on_requests boolean, on_accepted boolean, on_messages boolean, on_posts boolean,
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

  -- Every recipient gets a settings row, so there is always a private code for the Unsubscribe links.
  insert into public.notification_preferences (member_id)
  select distinct e.recipient_id from public.notification_events e where e.id = any(coalesce(ids, '{}'))
  on conflict do nothing;

  return query
  select e.id, e.recipient_id, e.kind, e.actor_id, a.name, a.job_title, a.company_name,
         left(case e.kind
                when 'connection_request' then (select c.note from public.connections c where c.id = e.ref_id)
                when 'connection_accepted' then ''
                else (select m.body from public.messages m where m.id = e.ref_id)
              end, 200),
         e.created_at, e.attempts,
         case e.kind when 'connection_request' then p.connection_requests_at when 'connection_accepted' then p.connection_accepted_at
                     when 'message' then p.messages_at else p.posts_at end,
         p.connection_requests_at is not null, p.connection_accepted_at is not null, p.messages_at is not null, p.posts_at is not null,
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

-- outcome: 'sent', 'skipped' (not wanted, too old, throttled, no address), or 'retry' (try again; the third failed try ends as failed).
create function public.finish_notification_event(p_id uuid, p_outcome text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_outcome = 'sent' then
    update public.notification_events set status = 'sent', sent_at = now() where id = p_id and status = 'sending';
  elsif p_outcome = 'skipped' then
    update public.notification_events set status = 'skipped' where id = p_id and status = 'sending';
  elsif p_outcome = 'retry' then
    update public.notification_events set attempts = attempts + 1, status = case when attempts + 1 >= 3 then 'failed' else 'pending' end
    where id = p_id and status = 'sending';
  else
    raise exception 'unknown outcome' using errcode = '22023';
  end if;
end
$$;

-- Turns a kind (or all) off for the member who owns the code. Never turns anything on. Returns the kind turned off, or null.
create function public.unsubscribe_with_code(p_code text, p_kind text)
returns text
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_code is null or p_code !~ '^[0-9a-f]{64}$' or p_kind is null or p_kind not in ('connection_request', 'connection_accepted', 'message', 'post', 'all') then
    return null;
  end if;
  update public.notification_preferences set
    connection_requests_at = case when p_kind in ('connection_request', 'all') then null else connection_requests_at end,
    connection_accepted_at = case when p_kind in ('connection_accepted', 'all') then null else connection_accepted_at end,
    messages_at = case when p_kind in ('message', 'all') then null else messages_at end,
    posts_at = case when p_kind in ('post', 'all') then null else posts_at end,
    updated_at = now()
  where unsubscribe_code = p_code;
  return case when found then p_kind end;
end
$$;

-- Housekeeping: finished rows older than 30 days are removed.
create function public.purge_notification_events()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.notification_events where status in ('sent', 'skipped', 'failed') and created_at < now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end
$$;

revoke all on function public.my_notification_preferences() from public, anon, authenticated, service_role;
revoke all on function public.set_notification_preferences(boolean, boolean, boolean, boolean) from public, anon, authenticated, service_role;
revoke all on function public.claim_notification_events(integer) from public, anon, authenticated, service_role;
revoke all on function public.finish_notification_event(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.unsubscribe_with_code(text, text) from public, anon, authenticated, service_role;
revoke all on function public.purge_notification_events() from public, anon, authenticated, service_role;
grant execute on function public.my_notification_preferences() to authenticated;
grant execute on function public.set_notification_preferences(boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.claim_notification_events(integer) to service_role;
grant execute on function public.finish_notification_event(uuid, text) to service_role;
grant execute on function public.unsubscribe_with_code(text, text) to service_role;
grant execute on function public.purge_notification_events() to service_role;
