begin;
select plan(47);

-- Admin A, complete members M and O, incomplete member N.
insert into auth.users (id, email) values
  ('ffffffff-cccc-0000-0000-000000000001', 'er1@x.test'),
  ('ffffffff-cccc-0000-0000-000000000002', 'er2@x.test'),
  ('ffffffff-cccc-0000-0000-000000000003', 'er3@x.test'),
  ('ffffffff-cccc-0000-0000-000000000004', 'er4@x.test');
update public.profiles set name = 'Ann Admin', role = 'admin', member_type = 'startup', job_title = 'CEO', company_name = 'Acme' where id = 'ffffffff-cccc-0000-0000-000000000001';
update public.profiles set name = 'Mia M', member_type = 'startup', job_title = 'CTO', company_name = 'Mco' where id = 'ffffffff-cccc-0000-0000-000000000002';
update public.profiles set name = 'Oz O', member_type = 'startup', job_title = 'COO', company_name = 'Oco' where id = 'ffffffff-cccc-0000-0000-000000000003';
update public.profiles set name = 'Nia N' where id = 'ffffffff-cccc-0000-0000-000000000004';
insert into public.events (luma_event_id, slug, title, start_at, timezone, luma_url) values
  ('evt-er-1', 'er-event', 'Ours', now() + interval '5 days', 'UTC', 'https://luma.com/ours');

-- Requests already in the database (for example from manual testing) must not change the counts; this is rolled back at the end.
delete from public.event_requests;

-- ===== visitors
set local role anon;
select throws_ok($$select public.submit_event_request('https://a.example/e', 'a.example', '', '{"title": "T"}')$$, '42501', null, 'visitors cannot ask');
select throws_ok($$select * from public.my_event_requests()$$, '42501', null, 'visitors cannot list');
select throws_ok($$select count(*) from public.event_requests$$, '42501', null, 'the table is closed to visitors');

-- ===== an incomplete profile cannot ask
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-cccc-0000-0000-000000000004","role":"authenticated"}', true);
select throws_ok($$select public.submit_event_request('https://a.example/e', 'a.example', '', '{"title": "T"}')$$, '42501', null, 'a member with an incomplete profile cannot ask');

-- ===== a member asks
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-cccc-0000-0000-000000000002","role":"authenticated"}', true);
select isnt(public.submit_event_request('https://a.example/e1', 'a.example', 'please add', '{"title": "T"}'), null, 'M asks for an event');
select throws_ok($$select public.submit_event_request('https://a.example/e1', 'a.example', '', '{"title": "T"}')$$, '23505', 'already requested', 'the same link twice is refused');
select throws_ok($$select public.submit_event_request('https://luma.com/ours', 'luma.com', '', '{"title": "T"}')$$, '23505', 'already on the site', 'a link already on the site is refused');
select throws_ok($$select public.submit_event_request('http://a.example/e2', 'a.example', '', '{"title": "T"}')$$, '22023', null, 'a link that is not https is refused');
select throws_ok($$select public.submit_event_request('https://a.example/e2', 'a.example', repeat('x', 301), '{"title": "T"}')$$, '22001', null, 'a long note is refused');
select throws_ok($$select public.submit_event_request('https://a.example/e2', 'a.example', '', '{"title": ""}')$$, '22023', null, 'details without a title are refused');
select throws_ok($$select public.submit_event_request('https://a.example/e2', 'a.example', '', '[]')$$, '22023', null, 'details that are not an object are refused');
select lives_ok($$select public.submit_event_request('https://a.example/e2', 'a.example', '', '{"title": "T"}')$$, 'a second');
select lives_ok($$select public.submit_event_request('https://a.example/e3', 'a.example', '', '{"title": "T"}')$$, 'a third');
select throws_ok($$select public.submit_event_request('https://a.example/e4', 'a.example', '', '{"title": "T"}')$$, 'P0001', 'too many waiting', 'a fourth waiting is refused');
select is((select count(*) from public.my_event_requests()), 3::bigint, 'M sees their three');
select throws_ok($$select count(*) from public.event_requests$$, '42501', null, 'M cannot read the table');
select is((select count(*) from public.admin_event_requests()), 0::bigint, 'M gets nothing from the admin list');

-- ===== another member sees nothing of M, and cannot withdraw it
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-cccc-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.my_event_requests()), 0::bigint, 'O sees none of M''s requests');
select throws_ok($$select public.withdraw_event_request('99999999-9999-9999-9999-999999999999')$$, 'P0002', null, 'O cannot withdraw what is not theirs');
select is(public.admin_pending_event_request_count(), 0, 'a member always gets 0 for the admin count');

-- ===== M withdraws one, then the daily limit
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-cccc-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$select public.withdraw_event_request((select id from public.my_event_requests() where url = 'https://a.example/e3'))$$, 'M withdraws a waiting request');
reset role;
insert into public.event_requests (requester_id, url, host, status, created_at)
select 'ffffffff-cccc-0000-0000-000000000002', 'https://old.example/' || g, 'old.example', 'rejected', now() - interval '1 hour' from generate_series(1, 8) g;
set local role authenticated;
select throws_ok($$select public.submit_event_request('https://a.example/e5', 'a.example', '', '{"title": "T"}')$$, 'P0001', 'too many today', 'ten in a day is the most');

-- ===== an admin decides
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-cccc-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.admin_event_requests()), 2::bigint, 'the admin sees the two waiting');
select is(public.admin_pending_event_request_count(), 2, 'and the count');
select is((select requester_name from public.admin_event_requests() where url = 'https://a.example/e1'), 'Mia M', 'with who asked');
select lives_ok($$select public.admin_reject_event_request((select id from public.admin_event_requests() where url = 'https://a.example/e2'), 'Not our kind of event')$$, 'the admin rejects one');
select throws_ok($$select public.admin_reject_event_request((select id from public.admin_event_requests() where url = 'https://a.example/e2'), '')$$, 'P0002', null, 'it is no longer waiting, so a second decision is refused');

-- Approving: adding the event from the request links the two.
select lives_ok($$select public.admin_save_external_event(null, 'er-new-event', 'New Event', '', now() + interval '9 days', null, 'UTC', 'online', null, null, null, null,
  'https://a.example/e1', 'a.example', false, (select id from public.admin_event_requests() where url = 'https://a.example/e1'))$$, 'the admin adds the event from the request');
select throws_ok($$select public.admin_save_external_event(null, 'er-other', 'Other', '', now() + interval '9 days', null, 'UTC', 'online', null, null, null, null,
  'https://a.example/other', 'a.example', false, '99999999-9999-9999-9999-999999999999')$$, 'P0002', null, 'a request that is not waiting cannot be approved');
select is((select count(*) from public.events where slug = 'er-other'), 0::bigint, 'and no event was added for it');
select is(public.admin_pending_event_request_count(), 0, 'nothing waits any more');
reset role;
select is((select status from public.event_requests where url = 'https://a.example/e1'), 'approved', 'the request is approved');
select is((select event_id from public.event_requests where url = 'https://a.example/e1'), (select id from public.events where slug = 'er-new-event'), 'and linked to the event');
select is((select decided_by from public.event_requests where url = 'https://a.example/e1'), 'ffffffff-cccc-0000-0000-000000000001'::uuid, 'with the admin who decided');

-- The member sees the outcome.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-cccc-0000-0000-000000000002","role":"authenticated"}', true);
select is((select event_slug from public.my_event_requests() where url = 'https://a.example/e1'), 'er-new-event', 'M sees the event of the approved request');
select is((select reject_reason from public.my_event_requests() where url = 'https://a.example/e2'), 'Not our kind of event', 'and the reason for the rejected one');
select throws_ok($$select public.admin_reject_event_request((select id from public.my_event_requests() limit 1), 'x')$$, '42501', null, 'a member cannot reject');

-- ===== emails (outbox rows; read as the table owner)
reset role;
select is((select count(*) from public.notification_events where kind = 'event_request' and recipient_id = 'ffffffff-cccc-0000-0000-000000000001' and actor_id = 'ffffffff-cccc-0000-0000-000000000002'), 3::bigint, 'the admin got one email row for each of the three requests');
select is((select count(*) from public.notification_events where kind = 'event_request' and recipient_id = 'ffffffff-cccc-0000-0000-000000000002'), 0::bigint, 'the person who asked got none');
select is((select count(*) from public.notification_events where kind = 'event_request_approved' and recipient_id = 'ffffffff-cccc-0000-0000-000000000002' and actor_id = 'ffffffff-cccc-0000-0000-000000000001'), 1::bigint, 'M is told about the approval');
select is((select count(*) from public.notification_events where kind = 'event_request_rejected' and recipient_id = 'ffffffff-cccc-0000-0000-000000000002'), 1::bigint, 'M is told about the rejection');
select is((select count(*) from public.notification_events where kind = 'event_request_approved' and recipient_id <> 'ffffffff-cccc-0000-0000-000000000002'), 0::bigint, 'nobody else is told');
create temp table claimed as select * from public.claim_notification_events(100);
select is((select preview from claimed where kind = 'event_request_rejected'), 'Not our kind of event', 'the rejection email carries the reason');
select is((select preview from claimed where kind = 'event_request_approved'), 'New Event', 'the approval email carries the event title');

-- ===== grants
reset role;
select is(has_function_privilege('anon', 'public.submit_event_request(text, text, text, jsonb)', 'execute'), false, 'anon cannot ask');
select is(has_function_privilege('authenticated', 'public.submit_event_request(text, text, text, jsonb)', 'execute'), true, 'members can ask');
select is(has_table_privilege('authenticated', 'public.event_requests', 'select'), false, 'the table is closed to members');

select * from finish();
rollback;
