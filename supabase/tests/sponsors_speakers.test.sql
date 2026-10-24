begin;
select plan(43);

-- Admin A, member M. One event for linking a speaker.
insert into auth.users (id, email) values
  ('ffffffff-aaaa-0000-0000-000000000001', 'ss1@x.test'),
  ('ffffffff-aaaa-0000-0000-000000000002', 'ss2@x.test');
update public.profiles set name = 'Ann Admin', role = 'admin' where id = 'ffffffff-aaaa-0000-0000-000000000001';
update public.profiles set name = 'Mia Member' where id = 'ffffffff-aaaa-0000-0000-000000000002';
insert into public.events (id, luma_event_id, slug, title, start_at, timezone, luma_url) values
  ('eeeeeeee-aaaa-0000-0000-000000000001', 'evt-ss-1', 'ss-event', 'Summit', now() + interval '5 days', 'UTC', 'https://luma.com/ss');

-- Seed rows as the owner role (bypasses the rules): one visible and one hidden of each.
insert into public.sponsors (id, name, tier, sort_order, visible) values
  ('11111111-aaaa-0000-0000-000000000001', 'Visible Sponsor', 'gold', 1, true),
  ('11111111-aaaa-0000-0000-000000000002', 'Hidden Sponsor', 'bronze', 2, false);
insert into public.speakers (id, slug, name, sort_order, visible) values
  ('22222222-aaaa-0000-0000-000000000001', 'visible-speaker', 'Visible Speaker', 1, true),
  ('22222222-aaaa-0000-0000-000000000002', 'hidden-speaker', 'Hidden Speaker', 2, false);

-- ===== visitors
set local role anon;
select is((select count(*) from public.sponsors), 1::bigint, 'visitors see only visible sponsors');
select is((select count(*) from public.speakers), 1::bigint, 'visitors see only visible speakers');
select throws_ok($$insert into public.sponsors (name, tier) values ('X', 'gold')$$, '42501', null, 'visitors cannot add a sponsor');
select throws_ok($$insert into public.speakers (slug, name) values ('x', 'X')$$, '42501', null, 'visitors cannot add a speaker');
select throws_ok($$insert into public.site_settings (key, value) values ('sponsor_contact_url', 'https://x.test/c')$$, '42501', null, 'visitors cannot change settings');

-- ===== a member
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-aaaa-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.sponsors), 1::bigint, 'members see only visible sponsors');
select is((select count(*) from public.speakers), 1::bigint, 'members see only visible speakers');
select throws_ok($$insert into public.sponsors (name, tier) values ('X', 'gold')$$, '42501', null, 'members cannot add a sponsor');
select lives_ok($$update public.sponsors set name = 'Hacked' where id = '11111111-aaaa-0000-0000-000000000001'$$, 'a member update does not error');
select is((select name from public.sponsors where id = '11111111-aaaa-0000-0000-000000000001'), 'Visible Sponsor', 'but changes nothing');
select lives_ok($$delete from public.speakers where id = '22222222-aaaa-0000-0000-000000000001'$$, 'a member delete does not error');
select is((select count(*) from public.speakers), 1::bigint, 'but deletes nothing');

-- ===== the admin
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-aaaa-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.sponsors), 2::bigint, 'an admin also sees hidden sponsors');
select is((select count(*) from public.speakers), 2::bigint, 'and hidden speakers');
select lives_ok($$insert into public.sponsors (name, tier, website_url, description, logo_path) values ('Acme', 'platinum', 'https://acme.test', 'About Acme', 'sponsors/33333333-3333-3333-3333-333333333333.png')$$, 'an admin adds a sponsor');
select lives_ok($$update public.sponsors set tier = 'silver', visible = false where name = 'Acme'$$, 'edits and hides it');
select is((select tier from public.sponsors where name = 'Acme'), 'silver', 'the edit is saved');
select lives_ok($$delete from public.sponsors where name = 'Acme'$$, 'and deletes it');
select lives_ok($$insert into public.speakers (slug, name, job_title, company, bio, photo_path, linkedin_url, website_url, event_id) values ('ada-lee', 'Ada Lee', 'CEO', 'Acme', 'Bio', 'speakers/44444444-4444-4444-4444-444444444444.jpg', 'https://www.linkedin.com/in/ada', 'https://ada.test', 'eeeeeeee-aaaa-0000-0000-000000000001')$$, 'an admin adds a speaker linked to an event');
select throws_ok($$insert into public.speakers (slug, name) values ('ada-lee', 'Other Ada')$$, '23505', null, 'a slug is unique');
select lives_ok($$insert into public.site_settings (key, value) values ('sponsor_contact_url', 'mailto:sponsors@x.test')$$, 'an admin sets the sponsor contact link');
select lives_ok($$update public.site_settings set value = 'https://x.test/contact' where key = 'sponsor_contact_url'$$, 'and changes it');

-- ===== the database refuses bad data, even from an admin
select throws_ok($$insert into public.sponsors (name, tier) values ('', 'gold')$$, '23514', null, 'a sponsor needs a name');
select throws_ok($$insert into public.sponsors (name, tier) values ('X', 'diamond')$$, '23514', null, 'the tier must be one of the four');
select throws_ok($$insert into public.sponsors (name, tier, website_url) values ('X', 'gold', 'http://plain.test')$$, '23514', null, 'a sponsor website must be https');
select throws_ok($$insert into public.sponsors (name, tier, description) values ('X', 'gold', repeat('d', 601))$$, '23514', null, 'a description over 600 characters is refused');
select throws_ok($$insert into public.sponsors (name, tier, logo_path) values ('X', 'gold', 'https://evil.test/logo.png')$$, '23514', null, 'a logo must be a file in our own folder, not an address');
select throws_ok($$insert into public.sponsors (name, tier, logo_path) values ('X', 'gold', 'sponsors/../avatars/x.png')$$, '23514', null, 'and not a path that climbs out of it');
select throws_ok($$insert into public.speakers (slug, name, bio) values ('b1', 'X', repeat('b', 1001))$$, '23514', null, 'a bio over 1000 characters is refused');
select throws_ok($$insert into public.speakers (slug, name, linkedin_url) values ('b2', 'X', 'https://evil.test/in/a')$$, '23514', null, 'a LinkedIn link must be on linkedin.com');
select throws_ok($$insert into public.speakers (slug, name) values ('Bad Slug', 'X')$$, '23514', null, 'a slug is lower-case words and dashes only');
select throws_ok($$insert into public.speakers (slug, name, photo_path) values ('b3', 'X', 'sponsors/44444444-4444-4444-4444-444444444444.jpg')$$, '23514', null, 'a speaker photo must be in the speakers folder');
select throws_ok($$insert into public.site_settings (key, value) values ('anything_else', 'x')$$, '23514', null, 'only known settings keys exist');
select throws_ok($$update public.site_settings set value = 'javascript:alert(1)' where key = 'sponsor_contact_url'$$, '23514', null, 'the contact link must be https or mailto');

-- ===== a speaker keeps working when its event goes
reset role;
delete from public.events where id = 'eeeeeeee-aaaa-0000-0000-000000000001';
select is((select event_id from public.speakers where slug = 'ada-lee'), null, 'deleting the event clears the speaker''s link');

-- ===== the picture bucket
select is((select file_size_limit from storage.buckets where id = 'site-images'), 512000::bigint, 'pictures are limited to 500 KB');
select is((select public from storage.buckets where id = 'site-images'), true, 'and are public for reading');
select is((select array_agg(t order by t) from storage.buckets, unnest(allowed_mime_types) t where id = 'site-images'), array['image/jpeg', 'image/png', 'image/webp'], 'only JPEG, PNG and WebP (no SVG)');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-aaaa-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$insert into storage.objects (bucket_id, name) values ('site-images', 'sponsors/55555555-5555-5555-5555-555555555555.png')$$, '42501', null, 'a member cannot upload a picture');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-aaaa-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$insert into storage.objects (bucket_id, name) values ('site-images', 'sponsors/55555555-5555-5555-5555-555555555555.png')$$, 'an admin can upload to the sponsors folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('site-images', 'other/55555555-5555-5555-5555-555555555555.png')$$, '42501', null, 'but not to any other folder');

-- ===== production-like grants
reset role;
select is(has_table_privilege('anon', 'public.sponsors', 'select'), true, 'visitors can read sponsors');
select is(has_table_privilege('anon', 'public.sponsors', 'insert'), false, 'but not write them');

select * from finish();
rollback;
