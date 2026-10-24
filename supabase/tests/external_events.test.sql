begin;
select plan(36);

-- Admin A, member M. One Luma event (an existing kind of row) to check it is left alone.
insert into auth.users (id, email) values
  ('ffffffff-bbbb-0000-0000-000000000001', 'ee1@x.test'),
  ('ffffffff-bbbb-0000-0000-000000000002', 'ee2@x.test');
update public.profiles set name = 'Ann Admin', role = 'admin' where id = 'ffffffff-bbbb-0000-0000-000000000001';
update public.profiles set name = 'Mia Member' where id = 'ffffffff-bbbb-0000-0000-000000000002';
insert into public.events (id, luma_event_id, slug, title, start_at, timezone, luma_url) values
  ('eeeeeeee-bbbb-0000-0000-000000000001', 'evt-own-1', 'own-event', 'Our Event', now() + interval '3 days', 'UTC', 'https://luma.com/own1');

-- ===== existing rows keep their kind
select is((select source from public.events where id = 'eeeeeeee-bbbb-0000-0000-000000000001'), 'luma', 'existing events are from our Luma calendar');

-- ===== a member and a visitor cannot add or change
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.admin_save_external_event(null, 'x', 'X', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://eventbrite.com/e/x', 'eventbrite.com', false)$$, '42501', null, 'a member cannot add an external event');
select throws_ok($$select public.admin_delete_external_event('eeeeeeee-bbbb-0000-0000-000000000001')$$, '42501', null, 'a member cannot delete');
reset role;
set local role anon;
select throws_ok($$select public.admin_save_external_event(null, 'x', 'X', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://eventbrite.com/e/x', 'eventbrite.com', false)$$, '42501', null, 'a visitor cannot add one either');

-- ===== the admin
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000001","role":"authenticated"}', true);
select isnt(public.admin_save_external_event(null, 'founders-night-abc', 'Founders Night', 'Come along', '2027-03-17 18:00+00', '2027-03-17 20:00+00', 'America/Los_Angeles', 'offline', 'Fort Mason', 'San Francisco', '2 Marina Blvd', 'https://img.evbuc.com/cover.jpg', 'https://www.eventbrite.com/e/founders-night-123', 'eventbrite.com', false), null, 'an admin adds an external event');
select set_config('t.eid', (select id::text from public.events where slug = 'founders-night-abc'), false);
select is((select source from public.events where slug = 'founders-night-abc'), 'external', 'it is marked external');
select is((select luma_event_id from public.admin_events() where slug = 'founders-night-abc'), null, 'without a Luma id');
select is((select luma_url from public.events where slug = 'founders-night-abc'), 'https://www.eventbrite.com/e/founders-night-123', 'its ticket link is the original link');
select is((select status::text || hidden::text from public.events where slug = 'founders-night-abc'), 'publishedfalse', 'public straight away');
select throws_ok($$select public.admin_save_external_event(null, 'other-slug', 'Same link', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://www.eventbrite.com/e/founders-night-123', 'eventbrite.com', false)$$, '23505', null, 'the same link cannot be added twice');
select throws_ok($$select public.admin_save_external_event(null, 'founders-night-abc', 'Same slug', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://example.com/e/2', 'example.com', false)$$, '23505', null, 'nor the same page address');
select lives_ok($$select public.admin_save_external_event(current_setting('t.eid')::uuid, 'ignored-new-slug', 'Founders Night (updated)', 'New text', '2027-03-17 19:00+00', null, 'Asia/Seoul', 'online', null, null, null, null, 'https://www.eventbrite.com/e/founders-night-123', 'eventbrite.com', true)$$, 'an admin edits it (and hides it)');
select is((select title || '|' || slug || '|' || hidden::text from public.events where id = current_setting('t.eid')::uuid), 'Founders Night (updated)|founders-night-abc|true', 'the title changed, the page address did not, and it is hidden');
select throws_ok($$select public.admin_save_external_event('eeeeeeee-bbbb-0000-0000-000000000001', 'x', 'Hijack', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://example.com/e/3', 'example.com', false)$$, 'P0002', null, 'an event from our Luma calendar cannot be changed this way');
select is((select title from public.events where id = 'eeeeeeee-bbbb-0000-0000-000000000001'), 'Our Event', 'and it is untouched');

-- ===== bad data is refused by the database
select throws_ok($$select public.admin_save_external_event(null, 'bad-tz', 'X', '', now() + interval '1 day', null, 'Mars/Base', 'offline', null, null, null, null, 'https://example.com/e/4', 'example.com', false)$$, '22023', null, 'an unknown timezone');
select throws_ok($$select public.admin_save_external_event(null, 'bad-end', 'X', '', '2027-03-17 20:00+00', '2027-03-17 18:00+00', 'UTC', 'offline', null, null, null, null, 'https://example.com/e/5', 'example.com', false)$$, '22023', null, 'an end before the start');
select throws_ok($$select public.admin_save_external_event(null, 'bad-link', 'X', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'http://plain.example/e', 'plain.example', false)$$, '23514', null, 'a link that is not https');
select throws_ok($$select public.admin_save_external_event(null, 'bad-cover', 'X', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, 'http://img.example/c.jpg', 'https://example.com/e/6', 'example.com', false)$$, '23514', null, 'a cover that is not https');
select throws_ok($$select public.admin_save_external_event(null, 'long-title', repeat('t', 201), '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://example.com/e/7', 'example.com', false)$$, '23514', null, 'a title over 200 characters');
select throws_ok($$select public.admin_save_external_event(null, 'long-desc', 'X', repeat('d', 2001), now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://example.com/e/8', 'example.com', false)$$, '23514', null, 'a description over 2000 characters');
select throws_ok($$select public.admin_save_external_event(null, 'Bad Slug', 'X', '', now() + interval '1 day', null, 'UTC', 'offline', null, null, null, null, 'https://example.com/e/9', 'example.com', false)$$, '22023', null, 'a page address that is not lower-case words');

-- ===== what the public sees
reset role;
update public.events set hidden = false where id = current_setting('t.eid')::uuid;
set local role anon;
select is((select count(*) from public.events where slug = 'founders-night-abc'), 1::bigint, 'visitors see a visible external event');
select is((select source || ':' || external_host from public.events where slug = 'founders-night-abc'), 'external:eventbrite.com', 'with its source and host for the label');
select throws_ok($$select external_url from public.events$$, '42501', null, 'but not the private external_url column (the ticket link is luma_url)');
select throws_ok($$select luma_sync_status from public.events$$, '42501', null, 'and still not the sync columns');

-- ===== the admin's list includes them, and attendance works
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.admin_events() where source = 'external'), 1::bigint, 'the admin list includes external events');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.set_attendance(current_setting('t.eid')::uuid, true), 'registered', 'a member can say they are attending an external event');
select is((select total from public.event_attendance(current_setting('t.eid')::uuid)), 1, 'it counts self-reported members');

-- ===== the sync leaves them alone; delete clears attendance
reset role;
select is((select count(*) from public.events where source = 'external' and removed_from_luma), 0::bigint, 'an external event is never marked removed from Luma');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$select public.admin_delete_external_event(current_setting('t.eid')::uuid)$$, 'an admin deletes it');
reset role;
select is((select count(*) from public.event_registrations where event_id = current_setting('t.eid')::uuid), 0::bigint, 'and its attendance goes with it');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-bbbb-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.admin_delete_external_event('eeeeeeee-bbbb-0000-0000-000000000001')$$, 'P0002', null, 'an event from our Luma calendar cannot be deleted this way');

-- ===== production-like grants
reset role;
select is(has_function_privilege('anon', 'public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean, uuid)', 'execute'), false, 'anon cannot run the admin function');
select is(has_function_privilege('authenticated', 'public.admin_save_external_event(uuid, text, text, text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, boolean, uuid)', 'execute'), true, 'signed-in members can call it (it checks admin itself)');
select is(has_function_privilege('anon', 'public.admin_delete_external_event(uuid)', 'execute'), false, 'anon cannot run the delete function');

select * from finish();
rollback;
