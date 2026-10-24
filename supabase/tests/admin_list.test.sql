begin;
select plan(7);

insert into auth.users (id, email) values
  ('ffffffff-dddd-0000-0000-000000000001', 'al1@x.test'),
  ('ffffffff-dddd-0000-0000-000000000002', 'al2@x.test');
update public.profiles set role = 'admin', name = 'Ann Admin' where id = 'ffffffff-dddd-0000-0000-000000000001';

set local role anon;
select throws_ok($$select * from public.admin_list_admins()$$, '42501', null, 'visitors cannot call it');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-dddd-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.admin_list_admins()), 0::bigint, 'a member gets nothing');

select set_config('request.jwt.claims', '{"sub":"ffffffff-dddd-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.admin_list_admins() where id = 'ffffffff-dddd-0000-0000-000000000001'), 1::bigint, 'an admin sees themselves');
select is((select email from public.admin_list_admins() where id = 'ffffffff-dddd-0000-0000-000000000001'), 'al1@x.test', 'with the login email');
select is((select count(*) from public.admin_list_admins() where id = 'ffffffff-dddd-0000-0000-000000000002'), 0::bigint, 'and no plain member');

reset role;
select is(has_function_privilege('anon', 'public.admin_list_admins()', 'execute'), false, 'anon has no execute right');
select is(has_function_privilege('authenticated', 'public.admin_list_admins()', 'execute'), true, 'signed-in users can call it');

select * from finish();
