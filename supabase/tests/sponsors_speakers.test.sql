begin;
select plan(58);

-- Admin A, member M. One event for linking a speaker.
insert into auth.users (id, email) values
  ('ffffffff-aaaa-0000-0000-000000000001', 'ss1@x.test'),
  ('ffffffff-aaaa-0000-0000-000000000002', 'ss2@x.test');
update public.profiles set name = 'Ann Admin', role = 'admin' where id = 'ffffffff-aaaa-0000-0000-000000000001';
update public.profiles set name = 'Mia Member' where id = 'ffffffff-aaaa-0000-0000-000000000002';
insert into public.events (id, luma_event_id, slug, title, start_at, timezone, luma_url) values
  ('eeeeeeee-aaaa-0000-0000-000000000001', 'evt-ss-1', 'ss-event', 'Summit', now() + interval '5 days', 'UTC', 'https://luma.com/ss'),
  ('eeeeeeee-aaaa-0000-0000-000000000002', 'evt-ss-2', 'ss-event-2', 'Night', now() + interval '6 days', 'UTC', 'https://luma.com/ss2');
insert into public.events (id, source, slug, title, start_at, timezone, luma_url, external_url, external_host) values
  ('eeeeeeee-aaaa-0000-0000-000000000003', 'external', 'ss-external', 'Their Event', now() + interval '7 days', 'UTC', 'https://www.eventbrite.com/e/x', 'https://www.eventbrite.com/e/x', 'eventbrite.com');

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
select lives_ok($$insert into public.speakers (id, slug, name, job_title, company, photo_path) values ('22222222-aaaa-0000-0000-000000000009', 'ada-lee', 'Ada Lee', 'CEO', 'Acme', 'speakers/44444444-4444-4444-4444-444444444444.jpg')$$, 'an admin adds a speaker');
select lives_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', array['eeeeeeee-aaaa-0000-0000-000000000001', 'eeeeeeee-aaaa-0000-0000-000000000002', 'eeeeeeee-aaaa-0000-0000-000000000002']::uuid[])$$, 'an admin links the speaker to two events (a repeated one counts once)');
select is((select count(*) from public.speaker_events where speaker_id = '22222222-aaaa-0000-0000-000000000009'), 2::bigint, 'two links are saved');
select lives_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', array['eeeeeeee-aaaa-0000-0000-000000000002']::uuid[])$$, 'and the set can be replaced');
select is((select event_id from public.speaker_events where speaker_id = '22222222-aaaa-0000-0000-000000000009'), 'eeeeeeee-aaaa-0000-0000-000000000002'::uuid, 'only the new one is left');
select lives_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', '{}'::uuid[])$$, 'an empty set clears them');
select throws_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', array['eeeeeeee-aaaa-0000-0000-0000000000ff']::uuid[])$$, '23503', null, 'an event that does not exist is refused');
select throws_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', array['eeeeeeee-aaaa-0000-0000-000000000001', 'eeeeeeee-aaaa-0000-0000-000000000003']::uuid[])$$, '22023', null, 'an event added from another site is refused');
select is((select count(*) from public.speaker_events where speaker_id = '22222222-aaaa-0000-0000-000000000009'), 0::bigint, 'and nothing was linked by that refused call (the earlier empty set stays)');
select throws_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-0000000000ff', '{}'::uuid[])$$, 'P0002', null, 'and so is a speaker that does not exist');
select lives_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', array['eeeeeeee-aaaa-0000-0000-000000000001', 'eeeeeeee-aaaa-0000-0000-000000000002']::uuid[])$$, 'the links are set again for the checks below');
select throws_ok($$insert into public.speakers (slug, name) values ('ada-lee', 'Other Ada')$$, '23505', null, 'a slug is unique');
select lives_ok($$insert into public.site_settings (key, value) values ('sponsor_contact_url', 'mailto:sponsors@x.test')$$, 'an admin sets the sponsor contact link');
select lives_ok($$update public.site_settings set value = 'https://x.test/contact' where key = 'sponsor_contact_url'$$, 'and changes it');

-- ===== the database refuses bad data, even from an admin
select throws_ok($$insert into public.sponsors (name, tier) values ('', 'gold')$$, '23514', null, 'a sponsor needs a name');
select throws_ok($$insert into public.sponsors (name, tier) values ('X', 'titanium')$$, '23514', null, 'the tier must be one of the five');
select lives_ok($$insert into public.sponsors (name, tier) values ('Diamond Co', 'diamond')$$, 'diamond is a tier');
select is((select tier from public.sponsors where name = 'Diamond Co'), 'diamond', 'and it is saved');
select throws_ok($$insert into public.sponsors (name, tier, website_url) values ('X', 'gold', 'http://plain.test')$$, '23514', null, 'a sponsor website must be https');
select throws_ok($$insert into public.sponsors (name, tier, description) values ('X', 'gold', repeat('d', 601))$$, '23514', null, 'a description over 600 characters is refused');
select throws_ok($$insert into public.sponsors (name, tier, logo_path) values ('X', 'gold', 'https://evil.test/logo.png')$$, '23514', null, 'a logo must be a file in our own folder, not an address');
select throws_ok($$insert into public.sponsors (name, tier, logo_path) values ('X', 'gold', 'sponsors/../avatars/x.png')$$, '23514', null, 'and not a path that climbs out of it');
select is((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'speakers' and column_name in ('bio', 'linkedin_url', 'website_url', 'event_id')), 0::bigint, 'a speaker no longer has a bio, LinkedIn, website or single event');
select throws_ok($$insert into public.speakers (slug, name) values ('Bad Slug', 'X')$$, '23514', null, 'a slug is lower-case words and dashes only');
select throws_ok($$insert into public.speakers (slug, name, photo_path) values ('b3', 'X', 'sponsors/44444444-4444-4444-4444-444444444444.jpg')$$, '23514', null, 'a speaker photo must be in the speakers folder');
select throws_ok($$insert into public.site_settings (key, value) values ('anything_else', 'x')$$, '23514', null, 'only known settings keys exist');
select throws_ok($$update public.site_settings set value = 'javascript:alert(1)' where key = 'sponsor_contact_url'$$, '23514', null, 'the contact link must be https or mailto');

-- ===== what visitors and members see of the links, and who can change them
reset role;
set local role anon;
select is((select count(*) from public.speaker_events where speaker_id = '22222222-aaaa-0000-0000-000000000009'), 2::bigint, 'visitors see a visible speaker''s events');
select throws_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', '{}'::uuid[])$$, '42501', null, 'visitors cannot change them');
reset role;
insert into public.speaker_events (speaker_id, event_id) values ('22222222-aaaa-0000-0000-000000000002', 'eeeeeeee-aaaa-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-aaaa-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.speaker_events where speaker_id = '22222222-aaaa-0000-0000-000000000002'), 0::bigint, 'members do not see the events of a hidden speaker');
select throws_ok($$select public.admin_set_speaker_events('22222222-aaaa-0000-0000-000000000009', '{}'::uuid[])$$, '42501', null, 'members cannot change them');

-- ===== a speaker keeps working when an event goes
reset role;
delete from public.events where id = 'eeeeeeee-aaaa-0000-0000-000000000001';
select is((select count(*) from public.speaker_events where speaker_id = '22222222-aaaa-0000-0000-000000000009'), 1::bigint, 'deleting an event removes only that link');

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
