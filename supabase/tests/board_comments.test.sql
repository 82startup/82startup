begin;
select plan(30);

-- A owns the post, B comments, C is an admin.
insert into auth.users (id, email) values
  ('bbbbbbbb-2200-0000-0000-00000000000a', 'a@bcomment.test'),
  ('bbbbbbbb-2200-0000-0000-00000000000b', 'b@bcomment.test'),
  ('bbbbbbbb-2200-0000-0000-00000000000c', 'c@bcomment.test');
update public.profiles set name = 'Ann A' where id = 'bbbbbbbb-2200-0000-0000-00000000000a';
update public.profiles set name = 'Bob B' where id = 'bbbbbbbb-2200-0000-0000-00000000000b';
update public.profiles set name = 'Cat C', role = 'admin' where id = 'bbbbbbbb-2200-0000-0000-00000000000c';
insert into public.board_posts (id, board_id, author_id, title, body)
  select '33333333-3333-3333-3333-333333333333', id, 'bbbbbbbb-2200-0000-0000-00000000000a', 'Post', 'Body' from public.boards where slug = 'showcase';

-- ===== logged out
set local role anon;
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', 'hi')$$, '42501', null, 'visitors cannot comment');

-- ===== B comments
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2200-0000-0000-00000000000b","role":"authenticated"}', true);
select throws_ok($$select * from public.board_comments$$, '42501', null, 'members cannot read the comments table');
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', E'  \n ')$$, '22023', null, 'an empty comment is refused');
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', E'\u00a0\u00a0')$$, '22023', null, 'a comment of only NBSP is refused');
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', E'\u200b')$$, '22023', null, 'a comment of only a zero-width space is refused');
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', E'\u3000')$$, '22023', null, 'a comment of only an ideographic space is refused');
reset role;
update public.profiles set name = '' where id = 'bbbbbbbb-2200-0000-0000-00000000000b';
set local role authenticated;
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', 'hi')$$, '22023', null, 'a member without a profile name cannot comment');
reset role;
update public.profiles set name = 'Bob B' where id = 'bbbbbbbb-2200-0000-0000-00000000000b';
set local role authenticated;
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', repeat('x', 1001))$$, '22001', null, 'a comment over 1000 characters is refused');
select throws_ok($$select public.create_board_comment(gen_random_uuid(), 'hi')$$, 'P0002', null, 'a comment on an unknown post is refused');
select ok((select public.create_board_comment('33333333-3333-3333-3333-333333333333', '  Nice  ')) is not null, 'a comment is created');
select is((select count(*) from public.board_comments_page('33333333-3333-3333-3333-333333333333', null, 50)), 1::bigint, 'the post lists it');
select is((select body from public.board_comments_page('33333333-3333-3333-3333-333333333333', null, 50)), 'Nice', 'trimmed');
select is((select comment_count from public.board_post('33333333-3333-3333-3333-333333333333')), 1, 'the post counts it');
select is((select can_delete from public.board_comments_page('33333333-3333-3333-3333-333333333333', null, 50)), true, 'the commenter may delete it');
select is((select count(*) from (select public.create_board_comment('33333333-3333-3333-3333-333333333333', 'c' || g) from generate_series(1, 29) g) s), 29::bigint, 'thirty comments fit in an hour');
select throws_ok($$select public.create_board_comment('33333333-3333-3333-3333-333333333333', 'one too many')$$, 'P0001', null, 'the thirty-first is refused');

-- ===== A: owns the post but not the comment
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2200-0000-0000-00000000000a","role":"authenticated"}', true);
select throws_ok($$select public.delete_board_comment((select id from public.board_comments_page('33333333-3333-3333-3333-333333333333', null, 50) limit 1))$$, 'P0002', null, 'the post author cannot delete someone else''s comment');
select is((select can_delete from public.board_comments_page('33333333-3333-3333-3333-333333333333', null, 50) limit 1), false, 'and is not offered the action');

-- ===== C (admin)
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2200-0000-0000-00000000000c","role":"authenticated"}', true);
select lives_ok($$select public.delete_board_comment((select id from public.board_comments_page('33333333-3333-3333-3333-333333333333', null, 50) limit 1))$$, 'an admin deletes a comment');
select is((select comment_count from public.board_post('33333333-3333-3333-3333-333333333333')), 29, 'the count goes down');

-- ===== B deletes their own
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2200-0000-0000-00000000000b","role":"authenticated"}', true);
select lives_ok($$select public.delete_board_comment((select id from public.board_comments_page('33333333-3333-3333-3333-333333333333', null, 50) limit 1))$$, 'a member deletes their own comment');
select is((select comment_count from public.board_post('33333333-3333-3333-3333-333333333333')), 28, 'the count goes down again');

-- ===== count follows the comments, including when a commenter's account is deleted
reset role;
insert into auth.users (id, email) values
  ('bbbbbbbb-2200-0000-0000-00000000000d', 'd@bcomment.test'),
  ('bbbbbbbb-2200-0000-0000-00000000000e', 'e@bcomment.test');
update public.profiles set name = 'Dan D' where id = 'bbbbbbbb-2200-0000-0000-00000000000d';
update public.profiles set name = 'Eve E' where id = 'bbbbbbbb-2200-0000-0000-00000000000e';
insert into public.board_posts (id, board_id, author_id, title, body)
  select '44444444-4444-4444-4444-444444444444', id, 'bbbbbbbb-2200-0000-0000-00000000000a', 'Post 2', 'Body' from public.boards where slug = 'showcase';
insert into public.board_comments (post_id, author_id, body) values
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-2200-0000-0000-00000000000d', 'one'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-2200-0000-0000-00000000000d', 'two'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-2200-0000-0000-00000000000b', 'three');
select is((select comment_count from public.board_posts where id = '44444444-4444-4444-4444-444444444444'), 3, 'the trigger counts inserted comments');
delete from auth.users where id = 'bbbbbbbb-2200-0000-0000-00000000000d';
select is((select comment_count from public.board_posts where id = '44444444-4444-4444-4444-444444444444'), 1, 'deleting a commenter''s account lowers the count');

-- ===== blocks: a blocked pair cannot comment, either way
insert into public.member_blocks (blocker_id, blocked_id) values ('bbbbbbbb-2200-0000-0000-00000000000a', 'bbbbbbbb-2200-0000-0000-00000000000e');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2200-0000-0000-00000000000e","role":"authenticated"}', true);
select throws_ok($$select public.create_board_comment('44444444-4444-4444-4444-444444444444', 'hi')$$, 'P0002', null, 'a member blocked by the post author cannot comment');
reset role;
delete from public.member_blocks where blocker_id = 'bbbbbbbb-2200-0000-0000-00000000000a';
insert into public.member_blocks (blocker_id, blocked_id) values ('bbbbbbbb-2200-0000-0000-00000000000e', 'bbbbbbbb-2200-0000-0000-00000000000a');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2200-0000-0000-00000000000e","role":"authenticated"}', true);
select throws_ok($$select public.create_board_comment('44444444-4444-4444-4444-444444444444', 'hi')$$, 'P0002', null, 'and neither can a member who blocked the author');
reset role;
delete from public.member_blocks where blocked_id = 'bbbbbbbb-2200-0000-0000-00000000000a';
select lives_ok($$delete from public.board_posts where id = '44444444-4444-4444-4444-444444444444'$$, 'deleting a post with comments cascades without error');

-- ===== cascade and grants
reset role;
delete from public.board_posts where id = '33333333-3333-3333-3333-333333333333';
select is((select count(*) from public.board_comments), 0::bigint, 'deleting a post deletes its comments');
select ok(has_function_privilege('authenticated', 'public.create_board_comment(uuid,text)', 'execute'), 'members can call create_board_comment');
select ok(not has_function_privilege('anon', 'public.create_board_comment(uuid,text)', 'execute'), 'visitors cannot');

select * from finish();
rollback;
