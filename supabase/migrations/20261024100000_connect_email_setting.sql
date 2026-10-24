-- Connection requests and accepted connections become one email choice, "connect". The two stored columns stay (they are still
-- how the sending job decides); the choice sets or clears both together.
drop function public.my_notification_preferences();
drop function public.set_notification_preferences(boolean, boolean, boolean);

-- "connect" is on only when both are on, so a member who had turned one of them off is not switched back on without asking.
create function public.my_notification_preferences()
returns table (connect boolean, messages boolean)
language sql stable security definer
set search_path = ''
as $$
  select p.member_id is null or (p.connection_requests_at is not null and p.connection_accepted_at is not null),
         p.member_id is null or p.messages_at is not null
  from (select (select auth.uid()) as uid) me
  left join public.notification_preferences p on p.member_id = me.uid
  where me.uid is not null
$$;

-- A choice that stays ticked keeps the time it has been on since (older events are never emailed after ticking it again later).
create function public.set_notification_preferences(p_connect boolean, p_messages boolean)
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
    connection_requests_at = case when p_connect then coalesce(connection_requests_at, now()) end,
    connection_accepted_at = case when p_connect then coalesce(connection_accepted_at, now()) end,
    messages_at = case when p_messages then coalesce(messages_at, now()) end,
    updated_at = now()
  where member_id = uid;
end
$$;

-- Same as before, plus 'connect' (both connection kinds). The two older kinds still work for links in emails already sent.
create or replace function public.unsubscribe_with_code(p_code text, p_kind text)
returns text
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_code is null or p_code !~ '^[0-9a-f]{64}$' or p_kind is null
     or p_kind not in ('connect', 'connection_request', 'connection_accepted', 'message', 'all') then
    return null;
  end if;
  update public.notification_preferences set
    connection_requests_at = case when p_kind in ('connect', 'connection_request', 'all') then null else connection_requests_at end,
    connection_accepted_at = case when p_kind in ('connect', 'connection_accepted', 'all') then null else connection_accepted_at end,
    messages_at = case when p_kind in ('message', 'all') then null else messages_at end,
    updated_at = now()
  where unsubscribe_code = p_code;
  return case when found then p_kind end;
end
$$;

revoke all on function public.my_notification_preferences() from public, anon, authenticated, service_role;
revoke all on function public.set_notification_preferences(boolean, boolean) from public, anon, authenticated, service_role;
revoke all on function public.unsubscribe_with_code(text, text) from public, anon, authenticated, service_role;
grant execute on function public.my_notification_preferences() to authenticated;
grant execute on function public.set_notification_preferences(boolean, boolean) to authenticated;
grant execute on function public.unsubscribe_with_code(text, text) to service_role;
