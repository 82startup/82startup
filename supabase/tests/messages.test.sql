begin;
select plan(50);

-- A (viewer), B (connected to A), C (only a pending request with A), D (connected to A, has old messages), E (stranger).
insert into auth.users (id, email) values
  ('ffffffff-6666-0000-0000-000000000001', 'ms1@x.test'),
  ('ffffffff-6666-0000-0000-000000000002', 'ms2@x.test'),
  ('ffffffff-6666-0000-0000-000000000003', 'ms3@x.test'),
  ('ffffffff-6666-0000-0000-000000000004', 'ms4@x.test'),
  ('ffffffff-6666-0000-0000-000000000005', 'ms5@x.test');
update public.profiles set name = 'Ann A' where id = 'ffffffff-6666-0000-0000-000000000001';
update public.profiles set name = 'Bo B' where id = 'ffffffff-6666-0000-0000-000000000002';
update public.profiles set name = 'Cy C' where id = 'ffffffff-6666-0000-0000-000000000003';
update public.profiles set name = 'Dee D' where id = 'ffffffff-6666-0000-0000-000000000004';
update public.profiles set name = 'Eve E' where id = 'ffffffff-6666-0000-0000-000000000005';
insert into public.connections (requester_id, addressee_id, status) values
  ('ffffffff-6666-0000-0000-000000000001', 'ffffffff-6666-0000-0000-000000000002', 'accepted'),
  ('ffffffff-6666-0000-0000-000000000001', 'ffffffff-6666-0000-0000-000000000003', 'pending'),
  ('ffffffff-6666-0000-0000-000000000004', 'ffffffff-6666-0000-0000-000000000001', 'accepted');

-- ===== logged out
set local role anon;
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000002', 'hi')$$, '42501', null, 'visitors cannot send');
select throws_ok($$select * from public.my_conversations()$$, '42501', null, 'visitors cannot list conversations');

-- ===== A: the table is closed, the rules on who and what
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select * from public.messages$$, '42501', null, 'members cannot read the messages table');
select throws_ok($$insert into public.messages (sender_id, recipient_id, body) values ('ffffffff-6666-0000-0000-000000000001', 'ffffffff-6666-0000-0000-000000000002', 'x')$$, '42501', null, 'members cannot write the messages table');
select throws_ok($$select public.deliver_message('ffffffff-6666-0000-0000-000000000001', 'ffffffff-6666-0000-0000-000000000002', 'x')$$, '42501', null, 'the internal delivery step is not callable by members');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000003', 'hi')$$, 'P0002', null, 'not to a member with only a pending request');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000005', 'hi')$$, 'P0002', null, 'not to a stranger');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-0000000000ff', 'hi')$$, 'P0002', null, 'not to someone who does not exist');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000001', 'hi')$$, '22023', null, 'not to yourself');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000002', '')$$, '22023', null, 'an empty message is refused');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000002', E'  \n  ')$$, '22023', null, 'a message of only spaces is refused');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000002', repeat('x', 2001))$$, '22001', null, 'a message over 2000 characters is refused');
select isnt(public.send_message('ffffffff-6666-0000-0000-000000000002', '  hello  '), null, 'a connected member can send');
select isnt(public.send_message('ffffffff-6666-0000-0000-000000000002', repeat('y', 2000)), null, 'exactly 2000 characters is accepted');

-- ===== B: receives, unread, reads, replies
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.unread_message_count(), 2, 'B has two unread messages');
select is((select count(*) from public.my_conversations()), 1::bigint, 'B has one conversation');
select is((select unread_count from public.my_conversations()), 2::bigint, 'with two unread');
select is((select name from public.my_conversations()), 'Ann A', 'with A');
select is((select char_length(last_body) from public.my_conversations()), 80, 'the preview is cut at 80 characters');
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000001', null, 50)), 2::bigint, 'B reads both');
select is((select body from public.conversation_messages('ffffffff-6666-0000-0000-000000000001', null, 50) where not is_mine order by created_at, id limit 1), 'hello', 'the body is stored trimmed');
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000001', null, 50) where is_unread), 2::bigint, 'both messages are marked unread for B');
select lives_ok($$select public.mark_conversation_read('ffffffff-6666-0000-0000-000000000001')$$, 'B opens the conversation');
select is(public.unread_message_count(), 0, 'nothing is unread any more');
select isnt(public.send_message('ffffffff-6666-0000-0000-000000000001', 'hi A'), null, 'B replies');

-- ===== A sees the reply as unread, marking read only affects the caller's own received messages
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.unread_message_count(), 1, 'A has one unread message');
select lives_ok($$select public.mark_conversation_read('ffffffff-6666-0000-0000-000000000002')$$, 'A opens it');
select is(public.unread_message_count(), 0, 'and it is read');
select isnt(public.send_message('ffffffff-6666-0000-0000-000000000002', 'again'), null, 'A writes again');
select lives_ok($$select public.mark_conversation_read('ffffffff-6666-0000-0000-000000000002')$$, 'A marking the conversation read does not mark A''s own sent messages for B');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.unread_message_count(), 1, 'B still has the new message unread');

-- ===== a stranger cannot read a conversation
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000001', null, 50)), 0::bigint, 'E cannot read A''s conversations');
select is((select count(*) from public.my_conversations()), 0::bigint, 'E has none');
select is(public.unread_message_count(), 0, 'and nothing unread');

-- ===== paging and ordering: 60 old messages between A and D
reset role;
insert into public.messages (sender_id, recipient_id, body, created_at)
  select 'ffffffff-6666-0000-0000-000000000004', 'ffffffff-6666-0000-0000-000000000001', 'old ' || g, now() - g * interval '2 minutes' - interval '10 minutes'
  from generate_series(1, 60) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000004', null, 50)), 50::bigint, 'a page is at most 50');
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000004', null, 1000)), 50::bigint, 'a huge limit is capped');
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000004', null, 0)), 1::bigint, 'a limit of zero gives one');
select is((select body from public.conversation_messages('ffffffff-6666-0000-0000-000000000004', null, 50) limit 1), 'old 1', 'newest first');
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000004', (select min(created_at) from public.conversation_messages('ffffffff-6666-0000-0000-000000000004', null, 50)), 50)), 10::bigint, 'the next page has the remaining 10');
select is((select member_id from public.my_conversations() limit 1), 'ffffffff-6666-0000-0000-000000000002'::uuid, 'conversations are ordered by last message, most recent first');

-- ===== disconnecting hides the conversation, reconnecting brings it back
reset role;
delete from public.connections where requester_id = 'ffffffff-6666-0000-0000-000000000001' and addressee_id = 'ffffffff-6666-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000002', null, 50)), 0::bigint, 'after a disconnect the messages are not readable');
select is((select count(*) from public.my_conversations() where member_id = 'ffffffff-6666-0000-0000-000000000002'), 0::bigint, 'and the conversation is not listed');
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000002', 'hi')$$, 'P0002', null, 'and nothing can be sent');
reset role;
insert into public.connections (requester_id, addressee_id, status) values ('ffffffff-6666-0000-0000-000000000002', 'ffffffff-6666-0000-0000-000000000001', 'accepted');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.conversation_messages('ffffffff-6666-0000-0000-000000000002', null, 50)), 4::bigint, 'after connecting again the history is back');

-- ===== the rate limit: 30 messages a minute
reset role;
insert into public.messages (sender_id, recipient_id, body, created_at)
  select 'ffffffff-6666-0000-0000-000000000001', 'ffffffff-6666-0000-0000-000000000002', 'burst ' || g, now() - interval '5 seconds'
  from generate_series(1, 27) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.send_message('ffffffff-6666-0000-0000-000000000002', 'one too many')$$, 'P0001', null, 'the 31st message in a minute is refused');
reset role;
update public.messages set created_at = now() - interval '2 minutes' where body like 'burst %';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-6666-0000-0000-000000000001","role":"authenticated"}', true);
select isnt(public.send_message('ffffffff-6666-0000-0000-000000000002', 'after a minute'), null, 'a minute later sending works again');

-- ===== production-like grants and cascade
reset role;
select is(has_function_privilege('anon', 'public.send_message(uuid, text)', 'execute'), false, 'anon has no execute');
select is(has_function_privilege('authenticated', 'public.send_message(uuid, text)', 'execute'), true, 'authenticated has execute');
select is(has_function_privilege('authenticated', 'public.deliver_message(uuid, uuid, text)', 'execute'), false, 'members cannot call the delivery step');
delete from auth.users where id = 'ffffffff-6666-0000-0000-000000000004';
select is((select count(*) from public.messages where 'ffffffff-6666-0000-0000-000000000004' in (sender_id, recipient_id)), 0::bigint, 'deleting a member deletes their messages');

select * from finish();
rollback;
