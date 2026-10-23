-- Member connections: a request that the other member accepts, plus blocks. Both tables are closed: nobody reads or
-- writes them directly, everything goes through the functions below (security definer, explicit grants).
create type public.connection_status as enum ('pending', 'accepted', 'declined');

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.connection_status not null default 'pending',
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
-- One row per pair of members, whichever of them asked.
create unique index connections_pair_key on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index connections_addressee_idx on public.connections (addressee_id, status);
alter table public.connections enable row level security;

create table public.member_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.member_blocks enable row level security;

revoke all on public.connections, public.member_blocks from public, anon, authenticated, service_role;

-- Internal helpers (not callable by members: they would reveal who is connected to whom). Chat uses are_connected.
create function public.are_connected(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and least(c.requester_id, c.addressee_id) = least(a, b)
      and greatest(c.requester_id, c.addressee_id) = greatest(a, b)
  )
$$;

create function public.is_blocked_either_way(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.member_blocks m
    where (m.blocker_id = a and m.blocked_id = b) or (m.blocker_id = b and m.blocked_id = a)
  )
$$;

-- Asks a member to connect. Returns 'pending', or 'connected' when they had already asked the caller (or it already was).
create function public.send_connection_request(p_addressee uuid, p_note text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  note text := btrim(coalesce(p_note, ''));
  existing public.connections;
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
      return 'connected';
    elsif existing.requester_id = uid and existing.responded_at > now() - interval '30 days' then
      raise exception 'wait before asking again' using errcode = 'P0001';
    end if;
    delete from public.connections where id = existing.id;
  end if;

  insert into public.connections (requester_id, addressee_id, note) values (uid, p_addressee, note);
  return 'pending';
end
$$;

create function public.respond_connection_request(p_id uuid, p_accept boolean)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_status public.connection_status := case when p_accept then 'accepted' else 'declined' end;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  update public.connections set status = new_status, responded_at = now()
  where id = p_id and addressee_id = uid and status = 'pending';
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  return new_status::text;
end
$$;

create function public.cancel_connection_request(p_id uuid)
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
  delete from public.connections where id = p_id and requester_id = uid and status = 'pending';
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
end
$$;

-- Ends a connection (either side). Harmless when there is none.
create function public.remove_connection(p_member uuid)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.connections c
  where (select auth.uid()) is not null
    and c.status = 'accepted'
    and least(c.requester_id, c.addressee_id) = least((select auth.uid()), p_member)
    and greatest(c.requester_id, c.addressee_id) = greatest((select auth.uid()), p_member)
$$;

-- Blocking also ends any connection or request between the two, in whatever state.
create function public.block_member(p_member uuid)
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
  if p_member = uid then
    raise exception 'cannot block yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_member) then
    raise exception 'member not available' using errcode = 'P0002';
  end if;
  insert into public.member_blocks (blocker_id, blocked_id) values (uid, p_member) on conflict do nothing;
  delete from public.connections c
  where least(c.requester_id, c.addressee_id) = least(uid, p_member)
    and greatest(c.requester_id, c.addressee_id) = greatest(uid, p_member);
end
$$;

create function public.unblock_member(p_member uuid)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.member_blocks where blocker_id = (select auth.uid()) and blocked_id = p_member
$$;

-- What the caller's profile button should show for another member:
-- self | blocked (the caller blocked them) | unavailable | connected | sent | received | none.
create function public.connection_state(p_member uuid)
returns text
language plpgsql stable security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c public.connections;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_member = uid then return 'self'; end if;
  if exists (select 1 from public.member_blocks m where m.blocker_id = uid and m.blocked_id = p_member) then return 'blocked'; end if;
  if exists (select 1 from public.member_blocks m where m.blocker_id = p_member and m.blocked_id = uid) then return 'unavailable'; end if;

  select * into c from public.connections x
  where least(x.requester_id, x.addressee_id) = least(uid, p_member)
    and greatest(x.requester_id, x.addressee_id) = greatest(uid, p_member);
  if found then
    if c.status = 'accepted' then return 'connected'; end if;
    if c.status = 'pending' then return case when c.requester_id = uid then 'sent' else 'received' end; end if;
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_member and p.show_in_directory and p.name <> '') then
    return 'unavailable';
  end if;
  return 'none';
end
$$;

-- The four lists on the Connections page. profile_visible says whether the member's profile can be opened.
create function public.my_connection_lists()
returns table (
  kind text,
  connection_id uuid,
  member_id uuid,
  name text,
  avatar_url text,
  job_title text,
  company_name text,
  note text,
  created_at timestamptz,
  profile_visible boolean
)
language sql stable security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as uid),
  rows as (
    select case when c.status = 'accepted' then 'connected'
                when c.addressee_id = me.uid then 'received'
                else 'sent' end as kind,
           c.id as connection_id,
           case when c.requester_id = me.uid then c.addressee_id else c.requester_id end as member_id,
           c.note, c.created_at
    from public.connections c, me
    where me.uid is not null
      and (c.requester_id = me.uid or c.addressee_id = me.uid)
      and (c.status = 'accepted' or c.status = 'pending')
    union all
    select 'blocked', null::uuid, b.blocked_id, ''::text, b.created_at
    from public.member_blocks b, me
    where me.uid is not null and b.blocker_id = me.uid
  )
  select r.kind, r.connection_id, r.member_id, p.name, p.avatar_url, p.job_title, p.company_name, r.note, r.created_at,
         (p.show_in_directory and p.name <> '') as profile_visible
  from rows r
  join public.profiles p on p.id = r.member_id
  order by r.kind, case when r.kind = 'connected' then lower(p.name) end, r.created_at desc, r.member_id
$$;

create function public.pending_request_count()
returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer from public.connections c
  where (select auth.uid()) is not null and c.addressee_id = (select auth.uid()) and c.status = 'pending'
$$;

revoke all on function public.are_connected(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.is_blocked_either_way(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.send_connection_request(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.respond_connection_request(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.cancel_connection_request(uuid) from public, anon, authenticated, service_role;
revoke all on function public.remove_connection(uuid) from public, anon, authenticated, service_role;
revoke all on function public.block_member(uuid) from public, anon, authenticated, service_role;
revoke all on function public.unblock_member(uuid) from public, anon, authenticated, service_role;
revoke all on function public.connection_state(uuid) from public, anon, authenticated, service_role;
revoke all on function public.my_connection_lists() from public, anon, authenticated, service_role;
revoke all on function public.pending_request_count() from public, anon, authenticated, service_role;

grant execute on function public.send_connection_request(uuid, text) to authenticated;
grant execute on function public.respond_connection_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_connection_request(uuid) to authenticated;
grant execute on function public.remove_connection(uuid) to authenticated;
grant execute on function public.block_member(uuid) to authenticated;
grant execute on function public.unblock_member(uuid) to authenticated;
grant execute on function public.connection_state(uuid) to authenticated;
grant execute on function public.my_connection_lists() to authenticated;
grant execute on function public.pending_request_count() to authenticated;
