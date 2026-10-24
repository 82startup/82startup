begin;
select plan(61);

-- A (actor), B (recipient), C, D, E and F (other pairs), G (connected to A and B).
insert into auth.users (id, email) values
  ('ffffffff-9999-0000-0000-000000000001', 'nt1@x.test'),
  ('ffffffff-9999-0000-0000-000000000002', 'nt2@x.test'),
  ('ffffffff-9999-0000-0000-000000000003', 'nt3@x.test'),
  ('ffffffff-9999-0000-0000-000000000004', 'nt4@x.test'),
  ('ffffffff-9999-0000-0000-000000000005', 'nt5@x.test'),
  ('ffffffff-9999-0000-0000-000000000006', 'nt6@x.test'),
  ('ffffffff-9999-0000-0000-000000000007', 'nt7@x.test');
update public.profiles set name = 'Ann A', job_title = 'CEO', company_name = 'Acme', member_type = 'startup' where id = 'ffffffff-9999-0000-0000-000000000001';
update public.profiles set name = 'Bo B', job_title = 'CTO', company_name = 'Bco', member_type = 'startup' where id = 'ffffffff-9999-0000-0000-000000000002';
update public.profiles set name = 'Cy C', member_type = 'startup' where id = 'ffffffff-9999-0000-0000-000000000003';
update public.profiles set name = 'Dee D', member_type = 'startup' where id = 'ffffffff-9999-0000-0000-000000000004';
update public.profiles set name = 'Eve E', member_type = 'startup' where id = 'ffffffff-9999-0000-0000-000000000005';
update public.profiles set name = 'Fay F', member_type = 'startup' where id = 'ffffffff-9999-0000-0000-000000000006';
update public.profiles set name = 'Gus G', member_type = 'startup' where id = 'ffffffff-9999-0000-0000-000000000007';

-- ===== logged out, and the closed tables
set local role anon;
select throws_ok($$select * from public.my_notification_preferences()$$, '42501', null, 'visitors cannot read settings');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select * from public.notification_events$$, '42501', null, 'members cannot read the outbox');
select throws_ok($$select * from public.notification_preferences$$, '42501', null, 'members cannot read the settings table');
select throws_ok($$select * from public.claim_notification_events(10)$$, '42501', null, 'members cannot claim notifications');
select throws_ok($$select public.unsubscribe_with_code('x', 'all')$$, '42501', null, 'members cannot use the unsubscribe step directly');
select throws_ok($$select public.finish_notification_event('00000000-0000-0000-0000-000000000000', 'sent')$$, '42501', null, 'members cannot finish notifications');

-- ===== settings: everything is off until ticked
select is((select row(connection_requests, connection_accepted, messages)::text from public.my_notification_preferences()), '(t,t,t)', 'every email is on by default');
select lives_ok($$select public.set_notification_preferences(true, false, true)$$, 'B unticks one of them');
select is((select row(connection_requests, connection_accepted, messages)::text from public.my_notification_preferences()), '(t,f,t)', 'and it is saved');

-- ===== the outbox: one row per event, for the right person
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-9999-0000-0000-000000000002', 'let us meet'), 'pending', 'A asks B');
select is(public.send_connection_request('ffffffff-9999-0000-0000-000000000002', 'again'), 'pending', 'asking again');
reset role;
select is((select count(*) from public.notification_events where kind = 'connection_request' and recipient_id = 'ffffffff-9999-0000-0000-000000000002' and actor_id = 'ffffffff-9999-0000-0000-000000000001'), 1::bigint, 'one connection-request row for B, not two');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.respond_connection_request((select connection_id from public.my_connection_lists() where kind = 'received'), true), 'accepted', 'B accepts');
reset role;
select is((select count(*) from public.notification_events where kind = 'connection_accepted' and recipient_id = 'ffffffff-9999-0000-0000-000000000001' and actor_id = 'ffffffff-9999-0000-0000-000000000002'), 1::bigint, 'one accepted row for A');

-- decline and cancel add nothing beyond the request itself
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-9999-0000-0000-000000000003', ''), 'pending', 'A asks C');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.respond_connection_request((select connection_id from public.my_connection_lists() where kind = 'received'), false), 'declined', 'C declines');
reset role;
select is((select count(*) from public.notification_events where recipient_id = 'ffffffff-9999-0000-0000-000000000001' and kind = 'connection_accepted'), 1::bigint, 'a decline sends A nothing (only the earlier acceptance)');

-- a mutual request counts as an acceptance for the one who asked first, and no request email
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000005","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-9999-0000-0000-000000000006', ''), 'pending', 'E asks F');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000006","role":"authenticated"}', true);
select is(public.send_connection_request('ffffffff-9999-0000-0000-000000000005', ''), 'connected', 'F asking E accepts');
reset role;
select is((select count(*) from public.notification_events where recipient_id = 'ffffffff-9999-0000-0000-000000000005'), 1::bigint, 'E gets one row (accepted)');
select is((select kind from public.notification_events where recipient_id = 'ffffffff-9999-0000-0000-000000000005'), 'connection_accepted', 'of the accepted kind');

-- messages and posts
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000001","role":"authenticated"}', true);
select isnt(public.send_message('ffffffff-9999-0000-0000-000000000002', 'hello Bo'), null, 'A messages B');
select isnt((select post_id from public.create_post('Big news')), null, 'A posts to the connections');
reset role;
select is((select count(*) from public.notification_events where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), 1::bigint, 'one message row for B');
select is((select count(*) from public.notification_events where kind = 'post' and actor_id = 'ffffffff-9999-0000-0000-000000000001'), 1::bigint, 'one post row, for the one connection A has');
select is((select ref_id from public.notification_events where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), (select id from public.messages where body = 'hello Bo'), 'the row points at the message');

-- ===== settings keep their ticked-since time, and unticking clears it
select isnt((select connection_requests_at from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), null, 'a kind that is on remembers since when');
select is((select messages_at is not null and connection_accepted_at is null from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), true, 'only the unticked kind is off');
select set_config('t.since', (select connection_requests_at::text from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), false);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$select public.set_notification_preferences(true, true, false)$$, 'B saves again');
reset role;
select is((select connection_requests_at::text from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), current_setting('t.since'), 'a kind that stays ticked keeps its time');
select is((select messages_at from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), null, 'an unticked kind is cleared');

-- ===== the job's claim: no email address, one claim only, a private code
set local role service_role;
select is((select count(*) from public.claim_notification_events(100) where recipient_id = 'ffffffff-9999-0000-0000-000000000002'), 3::bigint, 'the job claims B''s three waiting notifications');
select is((select count(*) from public.claim_notification_events(100) where recipient_id = 'ffffffff-9999-0000-0000-000000000002'), 0::bigint, 'and a second claim gets none of them');
reset role;
select is((select count(*) from public.notification_events where recipient_id = 'ffffffff-9999-0000-0000-000000000002' and status = 'sending'), 3::bigint, 'they are marked as being sent');
select is((select unsubscribe_code ~ '^[0-9a-f]{64}$' from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), true, 'B has a 64-character private code');
select isnt((select unsubscribe_code from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), (select unsubscribe_code from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000001'), 'and it differs from A''s');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'claim_notification_events' and pg_get_function_result(p.oid) ~* 'email'), 0::bigint, 'the claim result has no email column');

-- reclaiming rows stuck in "sending" for 10 minutes
update public.notification_events set claimed_at = now() - interval '11 minutes' where recipient_id = 'ffffffff-9999-0000-0000-000000000002' and kind = 'message';
set local role service_role;
select is((select count(*) from public.claim_notification_events(100) where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), 1::bigint, 'a row stuck while sending is picked up again');
select is((select count(*) from public.claim_notification_events(100)), 0::bigint, 'nothing left to claim');

-- ===== finishing: sent, skipped, and retries up to three tries
reset role;
select set_config('t.req', (select id from public.notification_events where kind = 'connection_request' and recipient_id = 'ffffffff-9999-0000-0000-000000000002')::text, false);
select set_config('t.msg', (select id from public.notification_events where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002')::text, false);
set local role service_role;
select lives_ok($$select public.finish_notification_event(current_setting('t.req')::uuid, 'sent')$$, 'finish as sent');
reset role;
select is((select status from public.notification_events where kind = 'connection_request' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), 'sent', 'it is marked sent');
select isnt((select sent_at from public.notification_events where kind = 'connection_request' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), null, 'with the time');
update public.notification_events set status = 'sending', claimed_at = now(), attempts = 0 where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002';
set local role service_role;
select lives_ok($$select public.finish_notification_event(current_setting('t.msg')::uuid, 'retry')$$, 'a failed send is returned for another try');
reset role;
select is((select status || attempts::text from public.notification_events where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), 'pending1', 'back to pending after one try');
update public.notification_events set status = 'sending', attempts = 2 where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002';
set local role service_role;
select lives_ok($$select public.finish_notification_event(current_setting('t.msg')::uuid, 'retry')$$, 'a third failure');
reset role;
select is((select status from public.notification_events where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), 'failed', 'ends as failed');

-- ===== the throttle needs when the last message email to this person from this sender was sent
update public.notification_events set status = 'sent', sent_at = now() - interval '20 minutes' where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-9999-0000-0000-000000000001","role":"authenticated"}', true);
select isnt(public.send_message('ffffffff-9999-0000-0000-000000000002', 'a second message'), null, 'A messages B again');
reset role;
set local role service_role;
select isnt((select last_sent_at from public.claim_notification_events(100) where kind = 'message' and recipient_id = 'ffffffff-9999-0000-0000-000000000002'), null, 'the claim tells when the last message email to B from A was sent');

-- ===== unsubscribing with the private code only turns things off
reset role;
update public.notification_preferences set connection_requests_at = now(), connection_accepted_at = now(), messages_at = now() where member_id = 'ffffffff-9999-0000-0000-000000000002';
select set_config('t.code', (select unsubscribe_code from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), false);
set local role service_role;
select is(public.unsubscribe_with_code(current_setting('t.code'), 'message'), 'message', 'the code turns the messages kind off');
reset role;
select is((select messages_at is null and connection_accepted_at is not null and connection_requests_at is not null from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), true, 'and nothing else');
set local role service_role;
select is(public.unsubscribe_with_code(current_setting('t.code'), 'all'), 'all', 'unsubscribe from all');
reset role;
select is((select count(*) from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002' and connection_requests_at is null and connection_accepted_at is null and messages_at is null), 1::bigint, 'turns all three off');
set local role service_role;
select is(public.unsubscribe_with_code('0000', 'all'), null, 'a malformed code does nothing');
select is(public.unsubscribe_with_code(repeat('a', 64), 'all'), null, 'an unknown code does nothing');
select is(public.unsubscribe_with_code(current_setting('t.code'), 'bogus'), null, 'an unknown kind does nothing');
reset role;
select is((select messages_at::text from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000001'), '-infinity', 'no other member was changed');

-- ===== grants and cascade
select is(has_function_privilege('anon', 'public.claim_notification_events(integer)', 'execute'), false, 'anon cannot claim');
select is(has_function_privilege('authenticated', 'public.claim_notification_events(integer)', 'execute'), false, 'members cannot claim');
select is(has_function_privilege('service_role', 'public.claim_notification_events(integer)', 'execute'), true, 'the server job can claim');
select is(has_function_privilege('authenticated', 'public.set_notification_preferences(boolean, boolean, boolean)', 'execute'), true, 'members can save their settings');
delete from auth.users where id = 'ffffffff-9999-0000-0000-000000000002';
select is((select count(*) from public.notification_events where 'ffffffff-9999-0000-0000-000000000002' in (recipient_id, actor_id)) + (select count(*) from public.notification_preferences where member_id = 'ffffffff-9999-0000-0000-000000000002'), 0::bigint, 'deleting a member deletes their notifications and settings');

select * from finish();
rollback;
