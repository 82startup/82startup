begin;
select plan(7);

-- Members A (picture), B (no picture), C (hidden from the list), D (not in the directory). Events: open and hidden.
insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-00000000000a', 'fa@x.test'),
  ('dddddddd-0000-0000-0000-00000000000b', 'fb@x.test'),
  ('dddddddd-0000-0000-0000-00000000000c', 'fc@x.test'),
  ('dddddddd-0000-0000-0000-00000000000d', 'fd@x.test');
update public.profiles set name = 'Ann', avatar_url = 'https://lh3.googleusercontent.com/a/ann' where id = 'dddddddd-0000-0000-0000-00000000000a';
update public.profiles set name = 'Bob' where id = 'dddddddd-0000-0000-0000-00000000000b';
update public.profiles set name = 'Cat', avatar_url = 'https://lh3.googleusercontent.com/a/cat' where id = 'dddddddd-0000-0000-0000-00000000000c';
update public.profiles set name = 'Dan', avatar_url = 'https://lh3.googleusercontent.com/a/dan', show_in_directory = false where id = 'dddddddd-0000-0000-0000-00000000000d';

insert into public.events (id, luma_event_id, slug, title, start_at, timezone, luma_url, hidden) values
  ('ffffffff-0000-0000-0000-000000000001', 'evt-faces-open',   'faces-open',   'Open',   now() + interval '2 days', 'UTC', 'https://luma.com/fo', false),
  ('ffffffff-0000-0000-0000-000000000002', 'evt-faces-hidden', 'faces-hidden', 'Hidden', now() + interval '2 days', 'UTC', 'https://luma.com/fh', true);

insert into public.event_registrations (event_id, member_id, source, show_in_list, created_at) values
  ('ffffffff-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-00000000000a', 'self', true,  now() - interval '2 hours'),
  ('ffffffff-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-00000000000b', 'self', true,  now() - interval '1 hour'),
  ('ffffffff-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-00000000000c', 'self', false, now()),
  ('ffffffff-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-00000000000d', 'self', true,  now()),
  ('ffffffff-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000a', 'self', true,  now());

-- ===== logged out
set local role anon;
select is((select count(*) from public.event_attendee_faces('ffffffff-0000-0000-0000-000000000001')), 2::bigint, 'visitors get only listed directory members');
select is((select array_agg(avatar_url) from public.event_attendee_faces('ffffffff-0000-0000-0000-000000000001')), array[null, 'https://lh3.googleusercontent.com/a/ann'], 'newest first, a missing picture as null');
select is((select count(*) from public.event_attendee_faces('ffffffff-0000-0000-0000-000000000002')), 0::bigint, 'nothing for a hidden event');
select throws_ok($$select * from public.event_attendees('ffffffff-0000-0000-0000-000000000001')$$, '42501', null, 'the named list stays members-only');

-- At most ten pictures.
reset role;
insert into auth.users (id, email) select ('dddddddd-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, 'many' || n || '@x.test' from generate_series(1, 12) n;
update public.profiles set name = 'Many' where id::text like 'dddddddd-0000-0000-0001-%';
insert into public.event_registrations (event_id, member_id, source) select 'ffffffff-0000-0000-0000-000000000001', ('dddddddd-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid, 'self' from generate_series(1, 12) n;
set local role anon;
select is((select count(*) from public.event_attendee_faces('ffffffff-0000-0000-0000-000000000001')), 10::bigint, 'at most ten');

-- ===== member
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*) from public.event_attendee_faces('ffffffff-0000-0000-0000-000000000001')), 10::bigint, 'members get the same pictures');
select is((select count(*) from public.event_attendee_faces('ffffffff-0000-0000-0000-000000000002')), 0::bigint, 'and nothing for a hidden event either');

select * from finish();
rollback;
