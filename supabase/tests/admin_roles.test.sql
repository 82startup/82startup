begin;
select plan(14);

-- Two admins (A1, A2) and two members (M1, M2).
insert into auth.users (id, email) values
  ('ffffffff-bbbb-0000-0000-000000000001', 'ar1@x.test'),
  ('ffffffff-bbbb-0000-0000-000000000002', 'ar2@x.test'),
  ('ffffffff-bbbb-0000-0000-000000000003', 'ar3@x.test'),
  ('ffffffff-bbbb-0000-0000-000000000004', 'ar4@x.test');
update public.profiles set role = 'admin' where id in ('ffffffff-bbbb-0000-0000-000000000001', 'ffffffff-bbbb-0000-0000-000000000002');
-- Other admins that already exist (the owner) must not make "last admin" tests depend on them: take them out for this test.
update public.profiles set role = 'member' where role = 'admin' and id not in ('ffffffff-bbbb-0000-0000-000000000001', 'ffffffff-bbbb-0000-0000-000000000002');

-- ===== visitors and members cannot
set local role anon;
select throws_ok($$select public.admin_set_role('ffffffff-bbbb-0000-0000-000000000003', 'admin')$$, '42501', null, 'visitors cannot call it');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.admin_set_role('ffffffff-bbbb-0000-0000-000000000004', 'admin')$$, '42501', null, 'members cannot make an admin');
select throws_ok($$select count(*) from public.role_changes$$, '42501', null, 'members cannot read the log');

-- ===== an admin
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$select public.admin_set_role('ffffffff-bbbb-0000-0000-000000000003', 'admin')$$, 'an admin makes M1 an admin');
reset role;
select is((select role::text from public.profiles where id = 'ffffffff-bbbb-0000-0000-000000000003'), 'admin', 'M1 is an admin');
set local role authenticated;
select throws_ok($$select public.admin_set_role('ffffffff-bbbb-0000-0000-000000000003', 'boss')$$, '22023', null, 'an unknown role is refused');
select throws_ok($$select public.admin_set_role('ffffffff-bbbb-0000-0000-000000000001', 'member')$$, '22023', null, 'an admin cannot remove their own role');
select lives_ok($$select public.admin_set_role('ffffffff-bbbb-0000-0000-000000000003', 'member')$$, 'an admin removes another admin');
select throws_ok($$select public.admin_set_role('00000000-0000-0000-0000-000000000000', 'admin')$$, 'P0002', null, 'an unknown member is refused');
reset role;
select is((select count(*) from public.role_changes where changed_by = 'ffffffff-bbbb-0000-0000-000000000001'), 2::bigint, 'both changes are logged');

-- An admin who was demoted behind the scenes can no longer change roles.
update public.profiles set role = 'member' where id = 'ffffffff-bbbb-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.admin_set_role('ffffffff-bbbb-0000-0000-000000000002', 'member')$$, '42501', null, 'a demoted admin cannot');
reset role;
select is(has_function_privilege('anon', 'public.admin_set_role(uuid, text)', 'execute'), false, 'anon has no execute');
select is(has_function_privilege('authenticated', 'public.admin_set_role(uuid, text)', 'execute'), true, 'members can call it (it checks admin inside)');
select is(has_table_privilege('authenticated', 'public.role_changes', 'select'), false, 'the log is closed to members');

select * from finish();
rollback;
