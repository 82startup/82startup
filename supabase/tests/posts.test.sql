begin;
select plan(43);

-- A (author), B and C (connected to A), D (pending only), E (blocked A), F (stranger), G (connects after the post),
-- H (author with 40 connections), X1..X40 (H's connections).
insert into auth.users (id, email) values
  ('ffffffff-7777-0000-0000-000000000001', 'po1@x.test'),
  ('ffffffff-7777-0000-0000-000000000002', 'po2@x.test'),
  ('ffffffff-7777-0000-0000-000000000003', 'po3@x.test'),
  ('ffffffff-7777-0000-0000-000000000004', 'po4@x.test'),
  ('ffffffff-7777-0000-0000-000000000005', 'po5@x.test'),
  ('ffffffff-7777-0000-0000-000000000006', 'po6@x.test'),
  ('ffffffff-7777-0000-0000-000000000007', 'po7@x.test'),
  ('ffffffff-7777-0000-0000-000000000008', 'po8@x.test');
insert into auth.users (id, email)
  select ('ffffffff-7777-0000-0001-' || lpad(g::text, 12, '0'))::uuid, 'pox' || g || '@x.test' from generate_series(1, 40) g;
insert into public.connections (requester_id, addressee_id, status) values
  ('ffffffff-7777-0000-0000-000000000001', 'ffffffff-7777-0000-0000-000000000002', 'accepted'),
  ('ffffffff-7777-0000-0000-000000000003', 'ffffffff-7777-0000-0000-000000000001', 'accepted'),
  ('ffffffff-7777-0000-0000-000000000001', 'ffffffff-7777-0000-0000-000000000004', 'pending');
insert into public.member_blocks (blocker_id, blocked_id) values ('ffffffff-7777-0000-0000-000000000005', 'ffffffff-7777-0000-0000-000000000001');
insert into public.connections (requester_id, addressee_id, status)
  select 'ffffffff-7777-0000-0000-000000000008', ('ffffffff-7777-0000-0001-' || lpad(g::text, 12, '0'))::uuid, 'accepted' from generate_series(1, 40) g;

-- ===== logged out
set local role anon;
select throws_ok($$select * from public.create_post('hi')$$, '42501', null, 'visitors cannot post');

-- ===== F (stranger, no connections) cannot post; A: the tables are closed
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000006","role":"authenticated"}', true);
select throws_ok($$select * from public.create_post('hi')$$, 'P0002', null, 'with no connections a post is refused');
select is((select connection_count from public.post_status()), 0, 'post_status shows no connections');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select * from public.posts$$, '42501', null, 'members cannot read the posts table');
select throws_ok($$insert into public.posts (author_id, body) values ('ffffffff-7777-0000-0000-000000000001', 'x')$$, '42501', null, 'members cannot write the posts table');
select throws_ok($$select public.deliver_message('ffffffff-7777-0000-0000-000000000001', 'ffffffff-7777-0000-0000-000000000002', 'x', false, null)$$, '42501', null, 'the delivery step is still not callable by members');
select throws_ok($$select * from public.create_post('')$$, '22023', null, 'an empty post is refused');
select throws_ok($$select * from public.create_post(E'  \n ')$$, '22023', null, 'a post of only spaces is refused');
select throws_ok($$select * from public.create_post(repeat('x', 2001))$$, '22001', null, 'a post over 2000 characters is refused');
select is((select connection_count from public.post_status()), 2, 'A has two connections (a pending request is not one)');
select is((select posts_left from public.post_status()), 5, 'and five posts left');

-- ===== A posts
select is((select recipient_count from public.create_post('  Big news  ')), 2, 'a post reports how many people it reached');
select is((select posts_left from public.post_status()), 4, 'one post used');
select is((select count(*) from public.my_posts(10)), 1::bigint, 'it is in my posts');
select is((select body from public.my_posts(10)), 'Big news', 'trimmed');
select is((select recipient_count from public.my_posts(10)), 2, 'with its recipient count');
select is((select count(*) from public.conversation_messages('ffffffff-7777-0000-0000-000000000002', null, 50) where is_post and is_mine), 1::bigint, 'the author sees it in the conversation with B, labeled as a post');
select is((select count(*) from public.conversation_messages('ffffffff-7777-0000-0000-000000000003', null, 50) where is_post and is_mine), 1::bigint, 'and with C');
select lives_ok($$select public.send_message('ffffffff-7777-0000-0000-000000000002', 'quick chat')$$, 'a post does not use up the per-minute message limit');

-- ===== B and C receive it; D, E, F do not; replies stay between two
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.conversation_messages('ffffffff-7777-0000-0000-000000000001', null, 50) where is_post and not is_mine and is_unread), 1::bigint, 'B gets the post, unread, labeled');
select is(public.unread_message_count(), 2, 'it counts in B''s unread number (the post and the chat message)');
select isnt(public.send_message('ffffffff-7777-0000-0000-000000000001', 'congrats'), null, 'B replies in the normal chat');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.conversation_messages('ffffffff-7777-0000-0000-000000000001', null, 50)), 1::bigint, 'C sees only the post, not B''s reply');
reset role;
select is((select count(*) from public.messages where recipient_id in ('ffffffff-7777-0000-0000-000000000004', 'ffffffff-7777-0000-0000-000000000005', 'ffffffff-7777-0000-0000-000000000006') and post_id is not null), 0::bigint, 'a pending request, a blocker and a stranger get nothing');
select is((select count(*) from public.messages where post_id is not null), 2::bigint, 'exactly two deliveries');

-- ===== someone who connects later does not get it
insert into public.connections (requester_id, addressee_id, status) values ('ffffffff-7777-0000-0000-000000000007', 'ffffffff-7777-0000-0000-000000000001', 'accepted');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000007","role":"authenticated"}', true);
select is((select count(*) from public.conversation_messages('ffffffff-7777-0000-0000-000000000001', null, 50)), 0::bigint, 'G, who connected afterwards, has no post');

-- ===== the limit: 5 posts in 24 hours
reset role;
insert into public.posts (author_id, body, created_at, recipient_count)
  select 'ffffffff-7777-0000-0000-000000000001', 'older ' || g, now() - g * interval '1 hour', 0 from generate_series(1, 3) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000001","role":"authenticated"}', true);
select is((select recipient_count from public.create_post('fifth')), 3, 'the fifth post works (G is connected now)');
select throws_ok($$select * from public.create_post('sixth')$$, 'P0001', null, 'the sixth post in 24 hours is refused');
select is((select posts_left from public.post_status()), 0, 'no posts left');
select isnt((select next_at from public.post_status()), null, 'and it says when posting works again');
reset role;
update public.posts set created_at = now() - interval '25 hours' where author_id = 'ffffffff-7777-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000001","role":"authenticated"}', true);
select is((select posts_left from public.post_status()), 5, 'after 24 hours the limit is clear');
select is((select count(*) from public.my_posts(1)), 1::bigint, 'my_posts honours its limit');
select is((select count(*) from public.my_posts(1000)), 5::bigint, 'and caps it at 10 (five exist)');

-- ===== a post to 40 connections is delivered in full (more than the per-minute limit of 30)
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000008","role":"authenticated"}', true);
select is((select recipient_count from public.create_post('To everyone')), 40, 'a post to 40 connections reaches all 40');
reset role;
select is((select count(*) from public.messages where sender_id = 'ffffffff-7777-0000-0000-000000000008' and post_id is not null), 40::bigint, 'with 40 messages');

-- ===== all or nothing
create function public.posts_test_boom() returns trigger language plpgsql as $$ begin
  if new.recipient_id = 'ffffffff-7777-0000-0001-000000000040' and new.body = 'boom' then raise exception 'boom'; end if;
  return new; end $$;
create trigger posts_test_boom before insert on public.messages for each row execute function public.posts_test_boom();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000008","role":"authenticated"}', true);
select throws_ok($$select * from public.create_post('boom')$$, 'P0001', null, 'a failure part-way refuses the whole post');
reset role;
select is((select count(*) from public.posts where body = 'boom'), 0::bigint, 'no post row is left');
select is((select count(*) from public.messages where body = 'boom'), 0::bigint, 'and no message is left');

-- ===== send_message keeps its own per-minute limit
insert into public.messages (sender_id, recipient_id, body, created_at)
  select 'ffffffff-7777-0000-0000-000000000002', 'ffffffff-7777-0000-0000-000000000001', 'burst ' || g, now() - interval '5 seconds' from generate_series(1, 30) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-7777-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.send_message('ffffffff-7777-0000-0000-000000000001', 'one too many')$$, 'P0001', null, 'normal messages are still limited to 30 a minute');

-- ===== production-like grants and cascade
reset role;
select is(has_function_privilege('anon', 'public.create_post(text)', 'execute'), false, 'anon has no execute');
select is(has_function_privilege('authenticated', 'public.create_post(text)', 'execute'), true, 'authenticated has execute');
select is(has_function_privilege('authenticated', 'public.deliver_message(uuid, uuid, text, boolean, uuid)', 'execute'), false, 'members cannot call the delivery step');
delete from auth.users where id = 'ffffffff-7777-0000-0000-000000000008';
select is((select count(*) from public.messages where post_id in (select id from public.posts where body = 'To everyone')) + (select count(*) from public.posts where body = 'To everyone'), 0::bigint, 'deleting the author deletes the post and its messages');

select * from finish();
rollback;
