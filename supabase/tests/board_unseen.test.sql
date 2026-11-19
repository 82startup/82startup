begin;
select plan(9);

-- A owns the post; B comments; A opens the post.
insert into auth.users (id, email) values
  ('bbbbbbbb-2300-0000-0000-00000000000a', 'a@bunseen.test'),
  ('bbbbbbbb-2300-0000-0000-00000000000b', 'b@bunseen.test');
update public.profiles set name = 'Ann A' where id = 'bbbbbbbb-2300-0000-0000-00000000000a';
update public.profiles set name = 'Bob B' where id = 'bbbbbbbb-2300-0000-0000-00000000000b';
insert into public.board_posts (id, board_id, author_id, title, body)
  select '44444444-4444-4444-4444-444444444444', id, 'bbbbbbbb-2300-0000-0000-00000000000a', 'Post', 'Body' from public.boards where slug = 'showcase';

set local role anon;
select throws_ok($$select * from public.unseen_board_comment_counts()$$, '42501', null, 'visitors cannot read counts');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2300-0000-0000-00000000000a","role":"authenticated"}', true);
select throws_ok($$select * from public.board_post_seen$$, '42501', null, 'members cannot read the seen table');
select public.create_board_comment('44444444-4444-4444-4444-444444444444', 'my own note');
select is((select count(*) from public.unseen_board_comment_counts()), 0::bigint, 'my own comment does not count');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2300-0000-0000-00000000000b","role":"authenticated"}', true);
select public.create_board_comment('44444444-4444-4444-4444-444444444444', 'hello');
select public.create_board_comment('44444444-4444-4444-4444-444444444444', 'again');
select is((select count(*) from public.unseen_board_comment_counts()), 0::bigint, 'the commenter sees no badge');
select public.mark_board_post_seen('44444444-4444-4444-4444-444444444444');
reset role;
select is((select count(*) from public.board_post_seen), 0::bigint, 'a non-author opening the post records nothing');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2300-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select unseen from public.unseen_board_comment_counts() where slug = 'showcase'), 2, 'the author sees two unseen comments');
select public.mark_board_post_seen('44444444-4444-4444-4444-444444444444');
select is((select count(*) from public.unseen_board_comment_counts()), 0::bigint, 'opening the post clears them');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2300-0000-0000-00000000000b","role":"authenticated"}', true);
select public.create_board_comment('44444444-4444-4444-4444-444444444444', 'one more');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-2300-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select unseen from public.unseen_board_comment_counts() where slug = 'showcase'), 1, 'a newer comment counts again');

reset role;
update public.boards set is_active = false where slug = 'showcase';
set local role authenticated;
select is((select count(*) from public.unseen_board_comment_counts()), 0::bigint, 'inactive boards are not counted');

select * from finish();
rollback;
