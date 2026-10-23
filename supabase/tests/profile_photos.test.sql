begin;
select plan(22);

-- Members A and B, one other bucket, one event both attend. Object names use fixed lower-case uuids.
insert into auth.users (id, email) values
  ('cdcdcdcd-0000-0000-0000-00000000000a', 'a@photo.test'),
  ('cdcdcdcd-0000-0000-0000-00000000000b', 'b@photo.test'),
  ('cdcdcdcd-0000-0000-0000-00000000000c', 'c@photo.test');
update public.profiles set name = 'Ann A' where id = 'cdcdcdcd-0000-0000-0000-00000000000a';
update public.profiles set name = 'Bob B', avatar_url = 'https://example.test/b.jpg' where id = 'cdcdcdcd-0000-0000-0000-00000000000b';
update public.profiles set name = 'Cat C', show_in_directory = false where id = 'cdcdcdcd-0000-0000-0000-00000000000c';

insert into storage.buckets (id, name, public) values ('other-bucket', 'other-bucket', true);
insert into storage.objects (bucket_id, name) values
  ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111.jpg'),
  ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000b/22222222-2222-2222-2222-222222222222.jpg'),
  ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/33333333-3333-3333-3333-333333333333.jpg');

insert into public.events (id, luma_event_id, slug, title, start_at, end_at, timezone, luma_url) values
  ('eeeeeeee-5555-0000-0000-000000000001', 'evt-photo-open', 'photo-open', 'Open', now() + interval '2 days', now() + interval '2 days 2 hours', 'UTC', 'https://luma.com/ph');
insert into public.event_registrations (event_id, member_id, status, source) values
  ('eeeeeeee-5555-0000-0000-000000000001', 'cdcdcdcd-0000-0000-0000-00000000000b', 'registered', 'self'),
  ('eeeeeeee-5555-0000-0000-000000000001', 'cdcdcdcd-0000-0000-0000-00000000000c', 'registered', 'self');

-- ===== the bucket
select ok((select public from storage.buckets where id = 'avatars'), 'the avatars bucket exists and is public for reading');
select is((select file_size_limit from storage.buckets where id = 'avatars'), 204800::bigint, 'it refuses anything over 200 KB');
select is((select allowed_mime_types from storage.buckets where id = 'avatars'), array['image/jpeg'], 'and anything that is not a JPEG');

-- ===== member A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cdcdcdcd-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select lives_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/44444444-4444-4444-4444-444444444444.jpg')$$, 'a member can add a photo in their own folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000b/55555555-5555-5555-5555-555555555555.jpg')$$, '42501', null, 'not in someone else''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'root-file.jpg')$$, '42501', null, 'not at the bucket root');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/sub/55555555-5555-5555-5555-555555555555.jpg')$$, '42501', null, 'not in a nested folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/55555555-5555-5555-5555-555555555555.png')$$, '42501', null, 'not with another extension');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/photo.jpg')$$, '42501', null, 'not with a name that is not a random id');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/55555555-5555-5555-5555-55555555555G.jpg')$$, '42501', null, 'not with a name that only looks like one');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('other-bucket', 'cdcdcdcd-0000-0000-0000-00000000000a/55555555-5555-5555-5555-555555555555.jpg')$$, '42501', null, 'not in another bucket');
-- Supabase refuses direct SQL deletes on storage.objects (deleting goes through the Storage API), so the delete rule is
-- checked here by its definition and exercised for real in the browser run.
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'members delete their own avatars' and cmd = 'DELETE'), 'the delete rule for a member''s own photos exists');
select lives_ok($$update storage.objects set name = 'cdcdcdcd-0000-0000-0000-00000000000a/66666666-6666-6666-6666-666666666666.jpg' where bucket_id = 'avatars' and name = 'cdcdcdcd-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111.jpg'$$, 'an update (overwrite) does not error');

-- a member sees only their own files
select is((select count(*) from storage.objects where bucket_id = 'avatars' and name like 'cdcdcdcd-0000-0000-0000-00000000000a/%'), 3::bigint, 'a member sees their own files');
select is((select count(*) from storage.objects where bucket_id = 'avatars' and name like 'cdcdcdcd-0000-0000-0000-00000000000b/%'), 0::bigint, 'and none of someone else''s');

-- what really happened, read as the superuser
reset role;
select is((select count(*) from storage.objects where name = 'cdcdcdcd-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111.jpg'), 1::bigint, 'and an overwrite or rename changed nothing');

-- ===== a visitor
set local role anon;
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'cdcdcdcd-0000-0000-0000-00000000000a/77777777-7777-7777-7777-777777777777.jpg')$$, '42501', null, 'a visitor cannot add a photo');
select is((select count(*) from storage.objects where bucket_id = 'avatars'), 0::bigint, 'and sees no files through the table (photos are read by their public address)');

-- ===== the attendee list carries the picture
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cdcdcdcd-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select avatar_url from public.event_attendees('eeeeeeee-5555-0000-0000-000000000001') where name = 'Bob B'), 'https://example.test/b.jpg', 'the attendee list returns each member''s picture address');
select is((select count(*) from public.event_attendees('eeeeeeee-5555-0000-0000-000000000001')), 1::bigint, 'and still leaves out a member who left the directory');

-- ===== grants
reset role;
select ok(not has_function_privilege('anon', 'public.event_attendees(uuid)', 'execute'), 'visitors still cannot read the attendee list');
select ok(has_function_privilege('authenticated', 'public.event_attendees(uuid)', 'execute'), 'members still can');

select * from finish();
rollback;
