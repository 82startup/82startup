begin;
select plan(15);

-- Members A (viewer), B (the one being viewed), C (left the directory), D (no name), E (admin).
insert into auth.users (id, email) values
  ('ffffffff-4444-0000-0000-000000000001', 'pe1@x.test'),
  ('ffffffff-4444-0000-0000-000000000002', 'pe2@x.test'),
  ('ffffffff-4444-0000-0000-000000000003', 'pe3@x.test'),
  ('ffffffff-4444-0000-0000-000000000004', 'pe4@x.test'),
  ('ffffffff-4444-0000-0000-000000000005', 'pe5@x.test');
update public.profiles set name = 'Viewer V' where id = 'ffffffff-4444-0000-0000-000000000001';
update public.profiles set name = 'Bo Baker' where id = 'ffffffff-4444-0000-0000-000000000002';
update public.profiles set name = 'Cy Hidden', show_in_directory = false where id = 'ffffffff-4444-0000-0000-000000000003';
update public.profiles set name = '' where id = 'ffffffff-4444-0000-0000-000000000004';
update public.profiles set name = 'Alex Admin', role = 'admin' where id = 'ffffffff-4444-0000-0000-000000000005';

insert into public.events (id, luma_event_id, slug, title, start_at, end_at, timezone, luma_url, status, hidden, removed_from_luma) values
  ('eeeeeeee-4444-0000-0000-000000000001', 'evt-pe-soon', 'pe-soon', 'Soon', now() + interval '2 days', now() + interval '2 days 2 hours', 'UTC', 'https://luma.com/a', 'published', false, false),
  ('eeeeeeee-4444-0000-0000-000000000002', 'evt-pe-later', 'pe-later', 'Later', now() + interval '9 days', null, 'UTC', 'https://luma.com/b', 'published', false, false),
  ('eeeeeeee-4444-0000-0000-000000000003', 'evt-pe-past', 'pe-past', 'Past', now() - interval '3 days', now() - interval '3 days' + interval '2 hours', 'UTC', 'https://luma.com/c', 'published', false, false),
  ('eeeeeeee-4444-0000-0000-000000000004', 'evt-pe-hidden', 'pe-hidden', 'Hidden', now() + interval '3 days', null, 'UTC', 'https://luma.com/d', 'published', true, false),
  ('eeeeeeee-4444-0000-0000-000000000005', 'evt-pe-removed', 'pe-removed', 'Removed', now() + interval '3 days', null, 'UTC', 'https://luma.com/e', 'published', false, true),
  ('eeeeeeee-4444-0000-0000-000000000006', 'evt-pe-draft', 'pe-draft', 'Canceled event', now() + interval '3 days', null, 'UTC', 'https://luma.com/f', 'cancelled', false, false),
  ('eeeeeeee-4444-0000-0000-000000000007', 'evt-pe-off', 'pe-off', 'Switched off', now() + interval '4 days', null, 'UTC', 'https://luma.com/g', 'published', false, false),
  ('eeeeeeee-4444-0000-0000-000000000008', 'evt-pe-cancelled', 'pe-cancelled', 'Cancelled', now() + interval '5 days', null, 'UTC', 'https://luma.com/h', 'published', false, false);

-- B is registered for everything; C and D each for the first event.
insert into public.event_registrations (event_id, member_id, status, source, show_in_list) values
  ('eeeeeeee-4444-0000-0000-000000000001', 'ffffffff-4444-0000-0000-000000000002', 'registered', 'self', true),
  ('eeeeeeee-4444-0000-0000-000000000002', 'ffffffff-4444-0000-0000-000000000002', 'registered', 'luma', true),
  ('eeeeeeee-4444-0000-0000-000000000003', 'ffffffff-4444-0000-0000-000000000002', 'registered', 'self', true),
  ('eeeeeeee-4444-0000-0000-000000000004', 'ffffffff-4444-0000-0000-000000000002', 'registered', 'self', true),
  ('eeeeeeee-4444-0000-0000-000000000005', 'ffffffff-4444-0000-0000-000000000002', 'registered', 'self', true),
  ('eeeeeeee-4444-0000-0000-000000000006', 'ffffffff-4444-0000-0000-000000000002', 'registered', 'self', true),
  ('eeeeeeee-4444-0000-0000-000000000007', 'ffffffff-4444-0000-0000-000000000002', 'registered', 'self', false),
  ('eeeeeeee-4444-0000-0000-000000000008', 'ffffffff-4444-0000-0000-000000000002', 'cancelled', 'self', true),
  ('eeeeeeee-4444-0000-0000-000000000001', 'ffffffff-4444-0000-0000-000000000003', 'registered', 'self', true),
  ('eeeeeeee-4444-0000-0000-000000000001', 'ffffffff-4444-0000-0000-000000000004', 'registered', 'self', true);

-- ===== logged out
set local role anon;
select throws_ok($$select * from public.member_events('ffffffff-4444-0000-0000-000000000002')$$, '42501', null, 'visitors cannot call it');

-- ===== member A looks at B
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-4444-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000002')), 2::bigint,
  'only the two upcoming, published (not canceled), visible, shown, registered events are returned');
select is((select array_agg(title order by start_at) from public.member_events('ffffffff-4444-0000-0000-000000000002')), array['Soon', 'Later'],
  'soonest first, from Luma and from I''m attending alike');
select is((select slug from public.member_events('ffffffff-4444-0000-0000-000000000002') order by start_at limit 1), 'pe-soon', 'with the slug for the link');
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000003')), 0::bigint, 'a member who left the directory shows nothing to others');
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000004')), 0::bigint, 'a member without a name shows nothing');
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000099')), 0::bigint, 'an unknown member shows nothing');

-- ===== member C (left the directory) sees their own
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-4444-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000003')), 1::bigint, 'a member sees their own list even after leaving the directory');

-- ===== admin sees a hidden member's list
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-4444-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000003')), 1::bigint, 'an admin sees the list of a member who left the directory');
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000002')), 2::bigint, 'and the usual rules still apply to events');

-- ===== B switches an event on and a cancelled one stays off
reset role;
update public.event_registrations set show_in_list = true where event_id = 'eeeeeeee-4444-0000-0000-000000000007' and member_id = 'ffffffff-4444-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-4444-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000002')), 3::bigint, 'switching Show me in the attendee list on adds the event');

-- ===== limit of 20
reset role;
insert into public.events (id, luma_event_id, slug, title, start_at, timezone, luma_url, status)
  select ('eeeeeeee-4444-0000-0001-' || lpad(g::text, 12, '0'))::uuid, 'evt-pe-bulk-' || g, 'pe-bulk-' || g, 'Bulk ' || g, now() + interval '20 days' + g * interval '1 hour', 'UTC', 'https://luma.com/x', 'published'
  from generate_series(1, 25) g;
insert into public.event_registrations (event_id, member_id, status, source)
  select id, 'ffffffff-4444-0000-0000-000000000002', 'registered', 'self' from public.events where slug like 'pe-bulk-%';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-4444-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.member_events('ffffffff-4444-0000-0000-000000000002')), 20::bigint, 'at most 20 events');
select is((select title from public.member_events('ffffffff-4444-0000-0000-000000000002') order by start_at limit 1), 'Soon', 'the soonest are the ones kept');

-- ===== production-like: only the explicit grant is needed, and anon and service_role get nothing
reset role;
select is(has_function_privilege('anon', 'public.member_events(uuid)', 'execute'), false, 'anon has no execute');
select is(has_function_privilege('authenticated', 'public.member_events(uuid)', 'execute'), true, 'authenticated has execute');

select * from finish();
rollback;
