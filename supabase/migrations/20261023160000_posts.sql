-- A member's post, delivered as a message from them to every member they are connected with at that moment. There is no
-- feed: a post is only ever seen by its author and its recipients, inside their conversations.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  recipient_count integer not null default 0
);
create index posts_author_idx on public.posts (author_id, created_at desc);
alter table public.posts enable row level security;
revoke all on public.posts from public, anon, authenticated, service_role;

alter table public.messages add column post_id uuid references public.posts (id) on delete cascade;
create index messages_post_idx on public.messages (post_id) where post_id is not null;

-- The delivery step gains two arguments: whether the per-minute limit applies (not for the many deliveries of one post)
-- and the post a message came from. Messages that come from a post do not count toward the per-minute limit either, so
-- posting never blocks someone from chatting. Still internal: members cannot call it.
drop function public.deliver_message(uuid, uuid, text);
create function public.deliver_message(p_sender uuid, p_recipient uuid, p_body text, p_rate_limited boolean, p_post uuid)
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
  return new_id;
end
$$;
revoke all on function public.deliver_message(uuid, uuid, text, boolean, uuid) from public, anon, authenticated, service_role;

create or replace function public.send_message(p_to uuid, p_body text)
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
  return public.deliver_message(uid, p_to, p_body, true, null);
end
$$;

-- The conversation now also says which messages came from a post.
drop function public.conversation_messages(uuid, timestamptz, integer);
create function public.conversation_messages(p_with uuid, p_before timestamptz, p_limit integer)
returns table (id uuid, body text, created_at timestamptz, is_mine boolean, is_unread boolean, is_post boolean)
language sql stable security definer
set search_path = ''
as $$
  select m.id, m.body, m.created_at, (m.sender_id = (select auth.uid())),
         (m.recipient_id = (select auth.uid()) and m.read_at is null),
         (m.post_id is not null)
  from public.messages m
  where (select auth.uid()) is not null
    and public.are_connected((select auth.uid()), p_with)
    and ((m.sender_id = (select auth.uid()) and m.recipient_id = p_with) or (m.sender_id = p_with and m.recipient_id = (select auth.uid())))
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 50)
$$;
revoke all on function public.conversation_messages(uuid, timestamptz, integer) from public, anon, authenticated, service_role;
grant execute on function public.conversation_messages(uuid, timestamptz, integer) to authenticated;

-- Posts: one transaction, so a failure part-way leaves nothing behind. At most 5 posts in any 24 hours.
create function public.create_post(p_body text)
returns table (post_id uuid, recipient_count integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  text_body text := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');
  new_post uuid;
  other uuid;
  delivered integer := 0;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if text_body = '' then
    raise exception 'post is empty' using errcode = '22023';
  end if;
  if char_length(text_body) > 2000 then
    raise exception 'post is too long' using errcode = '22001';
  end if;
  if not exists (select 1 from public.connections c where c.status = 'accepted' and uid in (c.requester_id, c.addressee_id)) then
    raise exception 'no connections' using errcode = 'P0002';
  end if;
  if (select count(*) from public.posts p where p.author_id = uid and p.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'too many posts' using errcode = 'P0001';
  end if;

  insert into public.posts (author_id, body) values (uid, text_body) returning id into new_post;
  for other in
    select case when c.requester_id = uid then c.addressee_id else c.requester_id end
    from public.connections c
    where c.status = 'accepted' and uid in (c.requester_id, c.addressee_id)
  loop
    perform public.deliver_message(uid, other, text_body, false, new_post);
    delivered := delivered + 1;
  end loop;
  update public.posts p set recipient_count = delivered where p.id = new_post;
  return query select new_post, delivered;
end
$$;

create function public.my_posts(p_limit integer)
returns table (id uuid, body text, created_at timestamptz, recipient_count integer)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.body, p.created_at, p.recipient_count
  from public.posts p
  where (select auth.uid()) is not null and p.author_id = (select auth.uid())
  order by p.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 10), 1), 10)
$$;

-- For the post box: posts left in the window, when the next slot opens (only when none is left), and the connection count.
create function public.post_status()
returns table (posts_left integer, next_at timestamptz, connection_count integer)
language sql stable security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as uid),
  recent as (
    select p.created_at from public.posts p, me
    where me.uid is not null and p.author_id = me.uid and p.created_at > now() - interval '24 hours'
  )
  select greatest(5 - (select count(*) from recent), 0)::integer,
         case when (select count(*) from recent) >= 5 then (select min(created_at) from recent) + interval '24 hours' end,
         (select count(*)::integer from public.connections c, me where me.uid is not null and c.status = 'accepted' and me.uid in (c.requester_id, c.addressee_id))
  from me where me.uid is not null
$$;

revoke all on function public.create_post(text) from public, anon, authenticated, service_role;
revoke all on function public.my_posts(integer) from public, anon, authenticated, service_role;
revoke all on function public.post_status() from public, anon, authenticated, service_role;
grant execute on function public.create_post(text) to authenticated;
grant execute on function public.my_posts(integer) to authenticated;
grant execute on function public.post_status() to authenticated;
