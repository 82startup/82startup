begin;
select plan(4);

insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'klee@sazze.vc'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'someone-else@example.com');

-- The statement below is the one in 20261023070100_appoint_owner_admin.sql.
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'klee@sazze.vc';

select is((select role::text from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'admin', 'the owner becomes an admin');
select is((select role::text from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'member', 'nobody else does');

update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'klee@sazze.vc';
select is(
  (select count(*) from public.profiles where role = 'admin' and id in ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')),
  1::bigint,
  'running it again changes nothing more'
);

delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select lives_ok(
  $$update public.profiles p set role = 'admin' from auth.users u where p.id = u.id and u.email = 'klee@sazze.vc'$$,
  'it is harmless when the owner account does not exist'
);

select * from finish();
rollback;
