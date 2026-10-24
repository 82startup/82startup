begin;
select plan(10);

insert into auth.users (id, email) values
  ('ffffffff-8888-0000-0000-000000000001', 'pc1@x.test'),
  ('ffffffff-8888-0000-0000-000000000002', 'pc2@x.test'),
  ('ffffffff-8888-0000-0000-000000000003', 'pc3@x.test'),
  ('ffffffff-8888-0000-0000-000000000004', 'pc4@x.test'),
  ('ffffffff-8888-0000-0000-000000000005', 'pc5@x.test'),
  ('ffffffff-8888-0000-0000-000000000006', 'pc6@x.test');
update public.profiles set name = 'Ann', job_title = 'CEO', company_name = 'Acme', member_type = 'startup' where id = 'ffffffff-8888-0000-0000-000000000001';
update public.profiles set name = 'Bo', job_title = 'CEO', company_name = 'Acme', member_type = null where id = 'ffffffff-8888-0000-0000-000000000002';
update public.profiles set name = '  ', job_title = 'CEO', company_name = 'Acme', member_type = 'startup' where id = 'ffffffff-8888-0000-0000-000000000003';
update public.profiles set name = 'Dee', job_title = '', company_name = 'Acme', member_type = 'startup' where id = 'ffffffff-8888-0000-0000-000000000004';
update public.profiles set name = 'Eve', job_title = 'CEO', company_name = E' \n ', member_type = 'student' where id = 'ffffffff-8888-0000-0000-000000000005';

set local role anon;
select throws_ok($$select public.profile_is_complete()$$, '42501', null, 'visitors cannot call it');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-8888-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.profile_is_complete(), true, 'a profile with all four fields is complete');
select set_config('request.jwt.claims', '{"sub":"ffffffff-8888-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.profile_is_complete(), false, 'no member type is incomplete');
select set_config('request.jwt.claims', '{"sub":"ffffffff-8888-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.profile_is_complete(), false, 'a name of only spaces is incomplete');
select set_config('request.jwt.claims', '{"sub":"ffffffff-8888-0000-0000-000000000004","role":"authenticated"}', true);
select is(public.profile_is_complete(), false, 'no job title is incomplete');
select set_config('request.jwt.claims', '{"sub":"ffffffff-8888-0000-0000-000000000005","role":"authenticated"}', true);
select is(public.profile_is_complete(), false, 'a company of only whitespace is incomplete');
select set_config('request.jwt.claims', '{"sub":"ffffffff-8888-0000-0000-000000000006","role":"authenticated"}', true);
select is(public.profile_is_complete(), false, 'a brand-new empty profile is incomplete');

reset role;
select is(has_function_privilege('anon', 'public.profile_is_complete()', 'execute'), false, 'anon has no execute');
select is(has_function_privilege('service_role', 'public.profile_is_complete()', 'execute'), false, 'service_role has no execute');
select is(has_function_privilege('authenticated', 'public.profile_is_complete()', 'execute'), true, 'authenticated has execute');

select * from finish();
rollback;
