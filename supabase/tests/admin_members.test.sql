begin;
select plan(29);

-- Test accounts carry the email marker "admtest" so a search for it finds exactly them, whatever else is in the database.
-- m1 admin, m2 member with name/type/last sign-in, m3 left the directory, m4 no name, m5 odd characters; m6 plain member (viewer).
insert into auth.users (id, email, created_at) values
  ('abababab-0000-0000-0000-000000000001', 'm1@admtest.test', now() - interval '1 day'),
  ('abababab-0000-0000-0000-000000000002', 'M2@admtest.test', now() - interval '2 days'),
  ('abababab-0000-0000-0000-000000000003', 'm3@admtest.test', now() - interval '3 days'),
  ('abababab-0000-0000-0000-000000000004', 'm4@admtest.test', now() - interval '4 days'),
  ('abababab-0000-0000-0000-000000000005', 'pat_1@admtest.test', now() - interval '5 days'),
  ('abababab-0000-0000-0000-000000000006', 'm6@other.test', now() - interval '6 days');
update auth.users set last_sign_in_at = timestamptz '2026-10-20 12:00:00+00' where id = 'abababab-0000-0000-0000-000000000002';
update public.profiles set name = 'Alex Admin', role = 'admin' where id = 'abababab-0000-0000-0000-000000000001';
update public.profiles set name = 'Bo Baker', member_type = 'startup' where id = 'abababab-0000-0000-0000-000000000002';
update public.profiles set name = 'Cy Hidden', show_in_directory = false where id = 'abababab-0000-0000-0000-000000000003';
update public.profiles set name = '' where id = 'abababab-0000-0000-0000-000000000004';
update public.profiles set name = 'Pat 100% Perc' where id = 'abababab-0000-0000-0000-000000000005';
update public.profiles set name = 'Viewer V' where id = 'abababab-0000-0000-0000-000000000006';

-- ===== logged out
set local role anon;
select throws_ok($$select * from public.admin_members('admtest', 10, 0)$$, '42501', null, 'visitors cannot call admin_members');

-- ===== a member gets nothing
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"abababab-0000-0000-0000-000000000006","role":"authenticated"}', true);
select is((select count(*) from public.admin_members('admtest', 100, 0)), 0::bigint, 'a member gets no rows');
select is((select count(*) from public.admin_members('', 100, 0)), 0::bigint, 'not even with an empty query');

-- ===== the admin
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"abababab-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.admin_members('admtest', 100, 0)), 5::bigint, 'an admin gets all five test accounts');
select is((select total from public.admin_members('admtest', 100, 0) limit 1), 5::bigint, 'with the total');
select is((select name from public.admin_members('admtest', 1, 0)), 'Alex Admin', 'newest joined first');
select is((select name from public.admin_members('admtest', 1, 4)), 'Pat 100% Perc', 'and oldest last');
select is((select email from public.admin_members('bo baker', 10, 0)), 'M2@admtest.test', 'the login email is returned');
select is((select role::text from public.admin_members('alex', 10, 0)), 'admin', 'the role is returned');
select is((select member_type::text from public.admin_members('bo baker', 10, 0)), 'startup', 'and the member type');
select is((select last_sign_in_at from public.admin_members('bo baker', 10, 0)), timestamptz '2026-10-20 12:00:00+00', 'and the last sign-in');
select is((select count(*) from public.admin_members('m1@admtest', 10, 0) where joined_at > now() - interval '25 hours'), 1::bigint, 'and the joined date');
select is((select directory from public.admin_members('m2@admtest', 10, 0)), 'yes', 'directory: yes');
select is((select directory from public.admin_members('m3@admtest', 10, 0)), 'no', 'directory: no, for a member who left');
select is((select directory from public.admin_members('m4@admtest', 10, 0)), 'no-name', 'directory: no name, for a member with nothing to list');
select is((select count(*) from public.admin_members('BO BAKER', 10, 0)), 1::bigint, 'search by name ignores case');
select is((select count(*) from public.admin_members('M2@ADMTEST.TEST', 10, 0)), 1::bigint, 'search by email ignores case');
select is((select count(*) from public.admin_members('%', 100, 0) where email like '%@admtest.test'), 1::bigint, 'a percent sign is literal');
select is((select count(*) from public.admin_members('_', 100, 0) where email like '%@admtest.test'), 1::bigint, 'an underscore is literal');
select is((select count(*) from public.admin_members('   ', 100, 0) where email like '%@admtest.test'), 5::bigint, 'a blank query lists everyone');
select lives_ok($$select * from public.admin_members(repeat('x', 200), 10, 0)$$, 'a very long query does not error');
select is((select count(*) from public.admin_members('admtest', 2, 2)), 2::bigint, 'paging: a page of two');
select is((select total from public.admin_members('admtest', 2, 2) limit 1), 5::bigint, 'paging: the total covers all matches');
select is((select count(*) from public.admin_members('admtest', 2, 4)), 1::bigint, 'paging: the last page is short');
select is((select count(*) from public.admin_members('admtest', 0, 0)), 0::bigint, 'a limit of zero returns nothing');
select is((select count(*) from public.admin_members('other.test', 10, 0) where email = 'm6@other.test'), 1::bigint, 'the viewer account is a member like the rest');

-- ===== grants
reset role;
select ok(not has_function_privilege('anon', 'public.admin_members(text, integer, integer)', 'execute'), 'visitors have no grant');
select ok(has_function_privilege('authenticated', 'public.admin_members(text, integer, integer)', 'execute'), 'members can call it (it returns nothing unless they are admins)');
select ok(not has_function_privilege('service_role', 'public.admin_members(text, integer, integer)', 'execute'), 'the service role has no grant');

select * from finish();
rollback;
