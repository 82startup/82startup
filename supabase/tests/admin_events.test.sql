begin;
select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin-test@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'member-test@example.com');
update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url, hidden, removed_from_luma, status, luma_sync_status, luma_sync_error) values
  ('evt-adm-visible',   'adm-visible',   'Visible',   now() + interval '1 day', 'UTC', 'https://luma.com/v', false, false, 'published', 'error', 'boom'),
  ('evt-adm-hidden',    'adm-hidden',    'Hidden',    now(), 'UTC', 'https://luma.com/h', true,  false, 'published', null, null),
  ('evt-adm-removed',   'adm-removed',   'Removed',   now(), 'UTC', 'https://luma.com/r', false, true,  'published', null, null),
  ('evt-adm-cancelled', 'adm-cancelled', 'Cancelled', now(), 'UTC', 'https://luma.com/c', false, false, 'cancelled', null, null);

-- logged out
set local role anon;
select throws_ok($$select public.is_admin()$$, '42501', null, 'logged-out visitors cannot call is_admin');
select throws_ok($$select * from public.admin_events()$$, '42501', null, 'logged-out visitors cannot call admin_events');
select throws_ok($$select luma_sync_error from public.events$$, '42501', null, 'logged-out visitors cannot read the sync columns');

-- member
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.is_admin(), false, 'a member is not an admin');
select is((select count(*) from public.admin_events() where slug like 'adm-%'), 0::bigint, 'admin_events returns nothing to a member');
select is((select count(*) from public.events where slug like 'adm-%'), 1::bigint, 'a member still reads only the visible event');
select is((select slug from public.events where slug = 'adm-visible'), 'adm-visible', 'and can read the public columns of it');
select throws_ok($$select luma_sync_error from public.events$$, '42501', null, 'a member cannot read the sync columns');
select lives_ok($$update public.events set featured = true$$, 'a member update does not error');
select is((select count(*) from public.events where slug like 'adm-%' and featured), 0::bigint, 'but it changes nothing: the row policy hides every row from it');

-- admin
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.is_admin(), true, 'an admin is an admin');
select is((select count(*) from public.events where slug like 'adm-%'), 4::bigint, 'an admin reads hidden, removed and cancelled events too');
select is((select count(*) from public.admin_events() where slug like 'adm-%'), 4::bigint, 'admin_events returns every event to an admin');
select is((select luma_sync_error from public.admin_events() where slug = 'adm-visible'), 'boom', 'and the sync error text');
select lives_ok($$update public.events set featured = true, hidden = true where slug = 'adm-removed'$$, 'an admin can change featured and hidden');
select is((select featured and hidden from public.admin_events() where slug = 'adm-removed'), true, 'and the change is saved');
select throws_ok($$update public.events set title = 'x' where slug = 'adm-visible'$$, '42501', null, 'an admin cannot change other columns');

select * from finish();
rollback;
