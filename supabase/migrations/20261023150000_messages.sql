-- One-to-one messages between connected members. The table is closed: nobody reads or writes it directly, everything
-- goes through the functions below (security definer, explicit grants). A conversation is the pair of members; it is
-- visible only while they are connected, and the messages are kept when they are not.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index messages_pair_idx on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index messages_unread_idx on public.messages (recipient_id) where read_at is null;
create index messages_sender_idx on public.messages (sender_id, created_at desc);
alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated, service_role;

-- The one delivery step. Internal: members cannot call it. send_message uses it, and so will posts (#30).
create function public.deliver_message(p_sender uuid, p_recipient uuid, p_body text)
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
  if (select count(*) from public.messages m where m.sender_id = p_sender and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many messages' using errcode = 'P0001';
  end if;
  insert into public.messages (sender_id, recipient_id, body) values (p_sender, p_recipient, text_body) returning id into new_id;
  return new_id;
end
$$;

create function public.send_message(p_to uuid, p_body text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  return public.deliver_message(uid, p_to, p_body);
end
$$;

-- Conversations with connected members who have at least one message, most recent first.
create function public.my_conversations()
returns table (member_id uuid, name text, avatar_url text, last_body text, last_at timestamptz, unread_count bigint)
language sql stable security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as uid),
  mine as (
    select m.id, m.body, m.created_at, m.read_at, m.recipient_id, me.uid,
           case when m.sender_id = me.uid then m.recipient_id else m.sender_id end as other
    from public.messages m, me
    where me.uid is not null and me.uid in (m.sender_id, m.recipient_id)
  ),
  conv as (
    select distinct on (other) other, left(body, 80) as last_body, created_at as last_at,
           count(*) filter (where recipient_id = uid and read_at is null) over (partition by other) as unread_count
    from mine
    where public.are_connected(uid, other)
    order by other, created_at desc, id desc
  )
  select p.id, p.name, p.avatar_url, c.last_body, c.last_at, c.unread_count
  from conv c
  join public.profiles p on p.id = c.other
  order by c.last_at desc, p.id
$$;

-- The messages with one connected member, newest first, before a time, at most 50. Empty unless connected.
create function public.conversation_messages(p_with uuid, p_before timestamptz, p_limit integer)
returns table (id uuid, body text, created_at timestamptz, is_mine boolean, is_unread boolean)
language sql stable security definer
set search_path = ''
as $$
  select m.id, m.body, m.created_at, (m.sender_id = (select auth.uid())),
         (m.recipient_id = (select auth.uid()) and m.read_at is null)
  from public.messages m
  where (select auth.uid()) is not null
    and public.are_connected((select auth.uid()), p_with)
    and ((m.sender_id = (select auth.uid()) and m.recipient_id = p_with) or (m.sender_id = p_with and m.recipient_id = (select auth.uid())))
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 50)
$$;

create function public.mark_conversation_read(p_with uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.messages set read_at = now()
  where (select auth.uid()) is not null
    and recipient_id = (select auth.uid()) and sender_id = p_with and read_at is null
    and public.are_connected((select auth.uid()), p_with)
$$;

create function public.unread_message_count()
returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer from public.messages m
  where (select auth.uid()) is not null
    and m.recipient_id = (select auth.uid()) and m.read_at is null
    and public.are_connected(m.recipient_id, m.sender_id)
$$;

revoke all on function public.deliver_message(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.send_message(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.my_conversations() from public, anon, authenticated, service_role;
revoke all on function public.conversation_messages(uuid, timestamptz, integer) from public, anon, authenticated, service_role;
revoke all on function public.mark_conversation_read(uuid) from public, anon, authenticated, service_role;
revoke all on function public.unread_message_count() from public, anon, authenticated, service_role;

grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.conversation_messages(uuid, timestamptz, integer) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.unread_message_count() to authenticated;
