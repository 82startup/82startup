begin;
select plan(41);

-- Members A (viewer), B, C, D (left the directory), E (no name), F (odd characters), G (admin).
-- Every listed test member has the company marker "Tqxco" so a search for it finds exactly them, whatever else is in the database.
insert into auth.users (id, email) values
  ('ffffffff-0000-0000-0000-000000000001', 'm1@x.test'),
  ('ffffffff-0000-0000-0000-000000000002', 'm2@x.test'),
  ('ffffffff-0000-0000-0000-000000000003', 'm3@x.test'),
  ('ffffffff-0000-0000-0000-000000000004', 'm4@x.test'),
  ('ffffffff-0000-0000-0000-000000000005', 'm5@x.test'),
  ('ffffffff-0000-0000-0000-000000000006', 'm6@x.test'),
  ('ffffffff-0000-0000-0000-000000000007', 'm7@x.test');
update public.profiles set name = 'Viewer V', company_name = 'Tqxco' where id = 'ffffffff-0000-0000-0000-000000000001';
update public.profiles set name = 'Bo Baker', company_name = 'Tqxco Bakery', member_type = 'startup', job_title = 'CEO' where id = 'ffffffff-0000-0000-0000-000000000002';
update public.profiles set name = 'Cy Cole', company_name = 'Tqxco Cole & Co', member_type = 'investor' where id = 'ffffffff-0000-0000-0000-000000000003';
update public.profiles set name = 'Dee Hidden', company_name = 'Tqxco', show_in_directory = false where id = 'ffffffff-0000-0000-0000-000000000004';
update public.profiles set name = '', company_name = 'Tqxco' where id = 'ffffffff-0000-0000-0000-000000000005';
update public.profiles set name = 'Pat 100% Perc', company_name = 'Tqxco a_b' where id = 'ffffffff-0000-0000-0000-000000000006';
update public.profiles set name = 'Alex Admin', company_name = 'Tqxco', role = 'admin' where id = 'ffffffff-0000-0000-0000-000000000007';

insert into public.events (id, luma_event_id, slug, title, start_at, end_at, timezone, luma_url) values
  ('eeeeeeee-3333-0000-0000-000000000001', 'evt-dir-open', 'dir-open', 'Open', now() + interval '2 days', now() + interval '2 days 2 hours', 'UTC', 'https://luma.com/d');
insert into public.event_registrations (event_id, member_id, status, source) values
  ('eeeeeeee-3333-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000002', 'registered', 'self'),
  ('eeeeeeee-3333-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000004', 'registered', 'self'),
  ('eeeeeeee-3333-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000005', 'registered', 'self');

-- ===== logged out
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'visitors cannot read profiles');
select throws_ok($$select * from public.search_members('tqxco', null, 10, 0)$$, '42501', null, 'visitors cannot search members');

-- ===== member A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select show_in_directory from public.profiles where id = 'ffffffff-0000-0000-0000-000000000001'), true, 'a profile is in the directory by default');
select is((select count(*) from public.profiles where id::text like 'ffffffff-0000-0000-0000-0000000000%'), 5::bigint, 'a member reads the listed profiles and their own, 5 of the 7');
select is((select count(*) from public.profiles where id = 'ffffffff-0000-0000-0000-000000000004'), 0::bigint, 'not a member who left the directory');
select is((select count(*) from public.profiles where id = 'ffffffff-0000-0000-0000-000000000005'), 0::bigint, 'not a member without a name');
select is((select name from public.profiles where id = 'ffffffff-0000-0000-0000-000000000002'), 'Bo Baker', 'the public columns are readable');
select throws_ok($$select role from public.profiles$$, '42501', null, 'members cannot read the role column');

select is((select count(*) from public.search_members('tqxco', null, 100, 0)), 5::bigint, 'the directory lists the five listed members');
select is((select name from public.search_members('tqxco', null, 1, 0)), 'Alex Admin', 'ordered by name');
select is((select name from public.search_members('tqxco', null, 1, 1)), 'Bo Baker', 'ignoring case, second is Bo');
select is((select count(*) from public.search_members('bo', null, 100, 0) where id = 'ffffffff-0000-0000-0000-000000000002'), 1::bigint, 'finds a member by name, any case');
select is((select count(*) from public.search_members('BAKERY', null, 100, 0) where id = 'ffffffff-0000-0000-0000-000000000002'), 1::bigint, 'finds a member by company');
select is((select count(*) from public.search_members('%', null, 100, 0) where id::text like 'ffffffff-0000-0000-0000-0000000000%'), 1::bigint, 'a percent sign is literal: only the one name with a percent sign');
select is((select count(*) from public.search_members('_', null, 100, 0) where id::text like 'ffffffff-0000-0000-0000-0000000000%'), 1::bigint, 'an underscore is literal: only the one company with an underscore');
select is((select count(*) from public.search_members('   ', null, 100, 0) where id::text like 'ffffffff-0000-0000-0000-0000000000%'), 5::bigint, 'a blank query lists everyone');
select lives_ok($$select * from public.search_members(repeat('x', 200), null, 10, 0)$$, 'a very long query does not error');
select is((select name from public.search_members('tqxco', 'investor', 10, 0)), 'Cy Cole', 'filters by type');
select is((select total from public.search_members('tqxco', 'investor', 10, 0)), 1::bigint, 'with the right total');
select is((select count(*) from public.search_members('cy', 'startup', 100, 0) where id::text like 'ffffffff-0000-0000-0000-0000000000%'), 0::bigint, 'type and query combine');
select is((select count(*) from public.search_members('tqxco', null, 2, 2)), 2::bigint, 'paging: a page of two');
select is((select total from public.search_members('tqxco', null, 2, 2) limit 1), 5::bigint, 'paging: the total is for all matches');
select is((select count(*) from public.search_members('tqxco', null, 2, 4)), 1::bigint, 'paging: the last page is short');
select is((select count(*) from public.search_members('tqxco', null, 0, 0)), 0::bigint, 'a limit of zero returns nothing');
select is((select count(*) from public.search_members('tqxco', null, 1000000, 0)), 5::bigint, 'a huge limit is accepted');

select is((select count(*) from public.event_attendees('eeeeeeee-3333-0000-0000-000000000001')), 1::bigint, 'the attendee list leaves out members who left the directory or have no name');
select is((select name from public.event_attendees('eeeeeeee-3333-0000-0000-000000000001')), 'Bo Baker', 'and lists the one who is in it');

select lives_ok($$update public.profiles set show_in_directory = false where id = 'ffffffff-0000-0000-0000-000000000002'$$, 'an update aimed at someone else does not error');
select is((select show_in_directory from public.profiles where id = 'ffffffff-0000-0000-0000-000000000002'), true, 'but changes nothing');
select lives_ok($$update public.profiles set show_in_directory = false where id = 'ffffffff-0000-0000-0000-000000000001'$$, 'a member can leave the directory');

-- ===== member B no longer sees A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.profiles where id = 'ffffffff-0000-0000-0000-000000000001'), 0::bigint, 'others can no longer read the profile of a member who left');
select is((select count(*) from public.search_members('tqxco', null, 100, 0)), 4::bigint, 'and the directory shows one fewer');

-- ===== member D (left the directory) still has their own profile
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.profiles where id = 'ffffffff-0000-0000-0000-000000000004'), 1::bigint, 'a member who left can still read their own profile');
select is((select count(*) from public.search_members('tqxco', null, 100, 0) where id = 'ffffffff-0000-0000-0000-000000000004'), 0::bigint, 'but is not in their own directory view');
select lives_ok($$update public.profiles set show_in_directory = true where id = 'ffffffff-0000-0000-0000-000000000004'$$, 'and can come back');
select is((select count(*) from public.search_members('tqxco', null, 100, 0) where id = 'ffffffff-0000-0000-0000-000000000004'), 1::bigint, 'then appears again');
select throws_ok($$update public.profiles set role = 'admin' where id = 'ffffffff-0000-0000-0000-000000000004'$$, '42501', null, 'a member still cannot change their role');

-- ===== admin G reads everything
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-000000000007","role":"authenticated"}', true);
select is((select count(*) from public.profiles where id::text like 'ffffffff-0000-0000-0000-0000000000%'), 7::bigint, 'an admin reads every profile');

-- ===== grants
reset role;
select ok(not has_function_privilege('anon', 'public.search_members(text, public.member_type, integer, integer)', 'execute'), 'visitors cannot run the search');
select ok(has_function_privilege('authenticated', 'public.search_members(text, public.member_type, integer, integer)', 'execute'), 'members can run the search');
select ok(not has_function_privilege('service_role', 'public.search_members(text, public.member_type, integer, integer)', 'execute'), 'and the service role has no grant');

select * from finish();
rollback;
