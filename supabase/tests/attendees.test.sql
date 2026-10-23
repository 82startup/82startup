begin;
select plan(57);

-- Members A, B, C and admin D. Events: open (10 people on Luma), past, hidden, gone.
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-00000000000a', 'a@x.test'),
  ('cccccccc-0000-0000-0000-00000000000b', 'b@x.test'),
  ('cccccccc-0000-0000-0000-00000000000c', 'c@x.test'),
  ('cccccccc-0000-0000-0000-00000000000d', 'd@x.test');
update public.profiles set name = 'Ann A', job_title = 'CEO', company_name = 'Acme' where id = 'cccccccc-0000-0000-0000-00000000000a';
update public.profiles set name = 'Bob B', job_title = 'CTO' where id = 'cccccccc-0000-0000-0000-00000000000b';
update public.profiles set role = 'admin' where id = 'cccccccc-0000-0000-0000-00000000000d';

insert into public.events (id, luma_event_id, slug, title, start_at, end_at, timezone, luma_url, hidden, removed_from_luma, luma_approved_count) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'evt-att-open',   'att-open',   'Open',   now() + interval '2 days', now() + interval '2 days 2 hours', 'UTC', 'https://luma.com/o', false, false, 10),
  ('eeeeeeee-0000-0000-0000-000000000002', 'evt-att-past',   'att-past',   'Past',   now() - interval '3 days', now() - interval '3 days' + interval '2 hours', 'UTC', 'https://luma.com/p', false, false, 0),
  ('eeeeeeee-0000-0000-0000-000000000003', 'evt-att-hidden', 'att-hidden', 'Hidden', now() + interval '1 day', null, 'UTC', 'https://luma.com/h', true, false, 0),
  ('eeeeeeee-0000-0000-0000-000000000004', 'evt-att-gone',   'att-gone',   'Gone',   now() + interval '1 day', null, 'UTC', 'https://luma.com/g', false, true, 0);

-- ===== logged out
set local role anon;
select throws_ok($$select * from public.event_registrations$$, '42501', null, 'visitors cannot read registrations');
select throws_ok($$select luma_approved_count from public.events$$, '42501', null, 'visitors cannot read the Luma count column directly');
select throws_ok($$select * from public.my_attendance('eeeeeeee-0000-0000-0000-000000000001')$$, '42501', null, 'visitors cannot call my_attendance');
select throws_ok($$select * from public.event_attendees('eeeeeeee-0000-0000-0000-000000000001')$$, '42501', null, 'visitors cannot see the list');
select throws_ok($$select public.set_attendance('eeeeeeee-0000-0000-0000-000000000001', true)$$, '42501', null, 'visitors cannot mark attendance');
select throws_ok($$select public.set_list_visibility('eeeeeeee-0000-0000-0000-000000000001', false)$$, '42501', null, 'visitors cannot change list visibility');
select throws_ok($$select * from public.sync_luma_attendees('evt-att-open', array['a@x.test'])$$, '42501', null, 'visitors cannot run the Luma attendee sync');
select throws_ok($$select * from public.admin_attendance()$$, '42501', null, 'visitors cannot call admin_attendance');
select is((select total from public.event_attendance('eeeeeeee-0000-0000-0000-000000000001')), 10, 'visitors see the total (Luma 10, nobody else yet)');
select is((select luma from public.event_attendance('eeeeeeee-0000-0000-0000-000000000001')), null, 'but not the split');
select is((select count(*) from public.event_attendance('eeeeeeee-0000-0000-0000-000000000003')), 0::bigint, 'and nothing for a hidden event');

-- ===== member A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select throws_ok($$select * from public.event_registrations$$, '42501', null, 'a member cannot read registrations directly');
select throws_ok($$insert into public.event_registrations (event_id, member_id, source) values ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-00000000000a', 'self')$$, '42501', null, 'a member cannot insert registrations directly');
select throws_ok($$select * from public.sync_luma_attendees('evt-att-open', array['a@x.test'])$$, '42501', null, 'a member cannot run the Luma attendee sync');
select throws_ok($$select luma_approved_count from public.events$$, '42501', null, 'a member cannot read the Luma count column directly');
select is(public.set_attendance('eeeeeeee-0000-0000-0000-000000000001', true), 'registered', 'a member can mark attending');
select is(public.set_attendance('eeeeeeee-0000-0000-0000-000000000001', true), 'registered', 'doing it again is harmless');
select is((select count(*) from public.my_attendance('eeeeeeee-0000-0000-0000-000000000001')), 1::bigint, 'there is one row for the member');
select is((select source::text from public.my_attendance('eeeeeeee-0000-0000-0000-000000000001')), 'self', 'it is self-reported');
select is((select show_in_list from public.my_attendance('eeeeeeee-0000-0000-0000-000000000001')), true, 'and listed by default');
select is(public.set_attendance('eeeeeeee-0000-0000-0000-000000000001', false), 'cancelled', 'a member can cancel');
select is(public.set_attendance('eeeeeeee-0000-0000-0000-000000000001', true), 'registered', 'and mark again');
select throws_ok($$select public.set_attendance('eeeeeeee-0000-0000-0000-000000000002', true)$$, 'P0002', null, 'not for an event that has ended');
select throws_ok($$select public.set_attendance('eeeeeeee-0000-0000-0000-000000000003', true)$$, 'P0002', null, 'not for a hidden event');
select throws_ok($$select public.set_attendance('eeeeeeee-0000-0000-0000-000000000004', true)$$, 'P0002', null, 'not for an event removed from Luma');
select is((select total from public.event_attendance('eeeeeeee-0000-0000-0000-000000000001')), 11, 'the total is Luma 10 plus the one self-reported member');

-- ===== member B sees the list
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*) from public.my_attendance('eeeeeeee-0000-0000-0000-000000000001')), 0::bigint, 'B has no registration of their own');
select is((select name from public.event_attendees('eeeeeeee-0000-0000-0000-000000000001')), 'Ann A', 'B sees A in the list');

-- A leaves the list but stays counted
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select lives_ok($$select public.set_list_visibility('eeeeeeee-0000-0000-0000-000000000001', false)$$, 'A can hide themselves from the list');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*) from public.event_attendees('eeeeeeee-0000-0000-0000-000000000001')), 0::bigint, 'B no longer sees A');
select is((select total from public.event_attendance('eeeeeeee-0000-0000-0000-000000000001')), 11, 'but A is still in the count');

-- ===== the Luma sync (service role)
reset role;
set local role service_role;
select is((select matched from public.sync_luma_attendees('evt-att-open', array['A@X.TEST', ' c@x.test ', 'stranger@nowhere.test'])), 2, 'matches members case-insensitively and ignores strangers');
reset role;
select is((select source::text from public.event_registrations where member_id = 'cccccccc-0000-0000-0000-00000000000a' and event_id = 'eeeeeeee-0000-0000-0000-000000000001'), 'luma', 'a self row turns into a Luma row');
select is((select count(*) from public.event_registrations where event_id = 'eeeeeeee-0000-0000-0000-000000000001'), 2::bigint, 'only A and C have rows; the stranger is stored nowhere');
set local role service_role;
select is((select matched from public.sync_luma_attendees('evt-att-open', array['a@x.test', 'c@x.test', 'stranger@nowhere.test'])), 2, 'running it again matches the same two');
reset role;
select is((select count(*) from public.event_registrations where event_id = 'eeeeeeee-0000-0000-0000-000000000001'), 2::bigint, 'and changes nothing');

set local role service_role;
select is((select cancelled from public.sync_luma_attendees('evt-att-open', array['c@x.test'])), 1, 'a member who left Luma is cancelled');
reset role;
select is((select status::text from public.event_registrations where member_id = 'cccccccc-0000-0000-0000-00000000000a' and event_id = 'eeeeeeee-0000-0000-0000-000000000001'), 'cancelled', 'A is cancelled');
select is((select status::text from public.event_registrations where member_id = 'cccccccc-0000-0000-0000-00000000000c' and event_id = 'eeeeeeee-0000-0000-0000-000000000001'), 'registered', 'C is still registered');

set local role service_role;
select is((select matched from public.sync_luma_attendees('evt-att-open', array['a@x.test', 'c@x.test'])), 2, 'A comes back when Luma lists them again');
reset role;
select is((select show_in_list from public.event_registrations where member_id = 'cccccccc-0000-0000-0000-00000000000a' and event_id = 'eeeeeeee-0000-0000-0000-000000000001'), false, 'and keeps the choice to stay out of the list');
select is((select count(*) from public.event_registrations where event_id = 'eeeeeeee-0000-0000-0000-000000000001' and source = 'luma' and status = 'registered'), 2::bigint, 'both are Luma registrations');

-- a Luma row is not counted twice and cannot be cancelled by the member
select is((select total from public.event_attendance('eeeeeeee-0000-0000-0000-000000000001')), 10, 'Luma members are inside the Luma count, not added again');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is(public.set_attendance('eeeeeeee-0000-0000-0000-000000000001', false), 'registered', 'a member cannot cancel a Luma registration here');

-- an empty list cancels every Luma row; the member may then mark again
reset role;
set local role service_role;
select is((select cancelled from public.sync_luma_attendees('evt-att-open', array[]::text[])), 2, 'an empty list cancels all Luma rows of that event');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is(public.set_attendance('eeeeeeee-0000-0000-0000-000000000001', true), 'registered', 'after Luma cancelled, the member can mark attending again');
select is((select source::text from public.my_attendance('eeeeeeee-0000-0000-0000-000000000001')), 'self', 'as a self-reported registration');

-- ===== admin
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select is((select self from public.event_attendance('eeeeeeee-0000-0000-0000-000000000001')), 1, 'an admin gets the split: one self-reported');
select is((select luma from public.admin_attendance() where event_id = 'eeeeeeee-0000-0000-0000-000000000001'), 10, 'admin_attendance gives the Luma count');
select is((select count(*) from public.event_attendance('eeeeeeee-0000-0000-0000-000000000003')), 1::bigint, 'an admin can read a hidden event');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*) from public.admin_attendance()), 0::bigint, 'a member gets nothing from admin_attendance');

-- ===== cascades
reset role;
delete from auth.users where id = 'cccccccc-0000-0000-0000-00000000000c';
select is((select count(*) from public.event_registrations where member_id = 'cccccccc-0000-0000-0000-00000000000c'), 0::bigint, 'deleting an account deletes its registrations');
delete from public.events where id = 'eeeeeeee-0000-0000-0000-000000000001';
select is((select count(*) from public.event_registrations where event_id = 'eeeeeeee-0000-0000-0000-000000000001'), 0::bigint, 'deleting an event deletes its registrations');

-- ===== grants (production grants nothing by default, so they must be explicit)
select ok(
  not has_function_privilege('anon', 'public.my_attendance(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.event_attendees(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.set_attendance(uuid, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.set_list_visibility(uuid, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.sync_luma_attendees(text, text[])', 'execute')
  and not has_function_privilege('anon', 'public.admin_attendance()', 'execute'),
  'visitors can run none of the member, sync or admin functions'
);
select ok(has_function_privilege('anon', 'public.event_attendance(uuid)', 'execute'), 'visitors can read the total');
select ok(
  has_function_privilege('authenticated', 'public.event_attendance(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.event_attendees(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.my_attendance(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.set_attendance(uuid, boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.set_list_visibility(uuid, boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.admin_attendance()', 'execute')
  and not has_function_privilege('authenticated', 'public.sync_luma_attendees(text, text[])', 'execute'),
  'members can run the member functions and not the sync'
);
select ok(has_function_privilege('service_role', 'public.sync_luma_attendees(text, text[])', 'execute'), 'the service role can run the sync');

select * from finish();
rollback;
