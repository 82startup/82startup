begin;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com', '{"full_name": "Ada Lee", "avatar_url": "https://example.com/a.png"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com', '{"name": "Bo Kim", "picture": "https://example.com/b.png"}');

-- signup trigger
select is((select count(*) from public.profiles), 2::bigint, 'a profile row is created for each new user');
select is((select name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ada Lee', 'name is taken from full_name');
select is((select avatar_url from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'https://example.com/b.png', 'avatar falls back to picture');
select is((select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'member', 'new profiles are members');
select is((select member_type from public.profiles where id = '11111111-1111-1111-1111-111111111111'), null, 'member type starts empty');

-- logged out
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'logged-out visitors cannot read profiles');

-- logged-in member A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((select count(*) from public.profiles), 2::bigint, 'a member can read every profile');

update public.profiles set name = 'Ada L.', member_type = 'founder' where id = '11111111-1111-1111-1111-111111111111';
select is((select name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ada L.', 'a member can edit their own name');

update public.profiles set name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
select is((select name from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'Bo Kim', 'a member cannot edit someone else''s profile');

select throws_ok($$update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'$$, '42501', null, 'a member cannot change their own role');
select throws_ok($$update public.profiles set linkedin_url = 'https://evil.example.com/x' where id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'linkedin_url must be a linkedin.com address');
select throws_ok($$update public.profiles set member_type = 'wizard' where id = '11111111-1111-1111-1111-111111111111'$$, '22P02', null, 'member type must be one of the four types');

-- signup edge cases (inserted as the superuser, like the auth service does)
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-333333333333', 'c@example.com', jsonb_build_object('full_name', repeat('x', 150))),
  ('44444444-4444-4444-4444-444444444444', 'd@example.com', '{}');
select is((select char_length(name) from public.profiles where id = '33333333-3333-3333-3333-333333333333'), 100, 'a 150-character name is cut to 100 so signup does not fail');
select is((select name from public.profiles where id = '44444444-4444-4444-4444-444444444444'), '', 'empty metadata gives an empty name');

set local role authenticated;
select throws_ok($$insert into public.profiles (id) values ('55555555-5555-5555-5555-555555555555')$$, '42501', null, 'a member cannot insert profiles');
select throws_ok($$delete from public.profiles$$, '42501', null, 'a member cannot delete profiles');

select * from finish();
rollback;
