begin;
select plan(63);

-- A authors the post, B comments, C is an admin.
insert into auth.users (id, email) values
  ('bbbbbbbb-3300-0000-0000-00000000000a', 'a@bedit.test'),
  ('bbbbbbbb-3300-0000-0000-00000000000b', 'b@bedit.test'),
  ('bbbbbbbb-3300-0000-0000-00000000000c', 'c@bedit.test');
update public.profiles set name = 'Ann A' where id = 'bbbbbbbb-3300-0000-0000-00000000000a';
update public.profiles set name = 'Bob B' where id = 'bbbbbbbb-3300-0000-0000-00000000000b';
update public.profiles set name = 'Cat C', role = 'admin' where id = 'bbbbbbbb-3300-0000-0000-00000000000c';
insert into public.board_posts (id, board_id, author_id, title, body, images)
  select 'aaaaaaaa-3300-0000-0000-000000000001', id, 'bbbbbbbb-3300-0000-0000-00000000000a', 'Old title', 'Old body',
         array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/1.jpg']
  from public.boards where slug = 'showcase';
insert into public.board_comments (id, post_id, author_id, body)
  values ('dddddddd-3300-0000-0000-000000000001', 'aaaaaaaa-3300-0000-0000-000000000001', 'bbbbbbbb-3300-0000-0000-00000000000b', 'Old comment');

-- ===== logged out
set local role anon;
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', '{}')$$, '42501', null, 'visitors cannot edit a post');
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', 'x')$$, '42501', null, 'visitors cannot edit a comment');

-- ===== A: refused edits
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-3300-0000-0000-00000000000a","role":"authenticated"}', true);
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', E'  \n ', 'b', '{}')$$, '22023', null, 'an empty title is refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', E' ', '{}')$$, '22023', null, 'a text of only NBSP is refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', array['bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg'])$$, '22023', null, 'a picture in someone else''s folder is refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000002/1.jpg'])$$, '22023', null, 'a picture under another post id is refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/5.jpg'])$$, '22023', null, 'a path ending 5.jpg is refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/1.jpg','bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/2.jpg','bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/3.jpg','bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/4.jpg','bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg'])$$, '22023', null, 'five pictures are refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg','bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg'])$$, '22023', null, 'the same picture twice is refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', repeat('x', 121), 'b', '{}')$$, '22001', null, 'a title over 120 characters is refused');
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', repeat('x', 5001), '{}')$$, '22001', null, 'a text over 5000 characters is refused');
select throws_ok($$select public.update_board_post(gen_random_uuid(), 't', 'b', '{}')$$, 'P0002', null, 'an unknown post is refused');
reset role;
update public.profiles set name = '' where id = 'bbbbbbbb-3300-0000-0000-00000000000a';
set local role authenticated;
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', '{}')$$, '22023', null, 'an author without a profile name cannot edit');
reset role;
update public.profiles set name = 'Ann A' where id = 'bbbbbbbb-3300-0000-0000-00000000000a';
set local role authenticated;
select is((select title from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), 'Old title', 'refused edits changed nothing');

-- ===== A: a successful edit
select is((select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', '  New title  ', E' New body　', array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg'])), array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/1.jpg'], 'replacing the picture returns the removed path');
select is((select title from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), 'New title', 'the title is trimmed and saved');
select is((select body from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), 'New body', 'the text is trimmed and saved');
select is((select images from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg'], 'the new picture list is saved');
select is((select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 'T2', 'B2', array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg','bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/2.jpg'])), '{}'::text[], 'keeping the picture removes none');
select is((select cardinality(images) from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), 2, 'a uuid name and an old name can coexist');
select is((select can_edit from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), true, 'the author may edit the post');
select is((select can_delete from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), true, 'the author may delete the post');
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', 'x')$$, 'P0002', null, 'the post author cannot edit someone else''s comment');
select is((select can_edit from public.board_comments_page('aaaaaaaa-3300-0000-0000-000000000001', null, 50)), false, 'and is not offered comment editing');

-- ===== B: the commenter
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-3300-0000-0000-00000000000b","role":"authenticated"}', true);
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', '{}')$$, 'P0002', null, 'another member cannot edit the post');
select is((select can_edit from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), false, 'another member is not offered post editing');
select is((select can_edit from public.board_comments_page('aaaaaaaa-3300-0000-0000-000000000001', null, 50)), true, 'the commenter may edit');
select is((select can_delete from public.board_comments_page('aaaaaaaa-3300-0000-0000-000000000001', null, 50)), true, 'and delete');
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', E'  \n ')$$, '22023', null, 'an empty comment is refused');
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', E' ')$$, '22023', null, 'a comment of only NBSP is refused');
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', repeat('x', 1001))$$, '22001', null, 'a comment over 1000 characters is refused');
select throws_ok($$select public.update_board_comment(gen_random_uuid(), 'x')$$, 'P0002', null, 'an unknown comment is refused');
reset role;
update public.profiles set name = '' where id = 'bbbbbbbb-3300-0000-0000-00000000000b';
set local role authenticated;
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', 'x')$$, '22023', null, 'a commenter without a profile name cannot edit');
reset role;
update public.profiles set name = 'Bob B' where id = 'bbbbbbbb-3300-0000-0000-00000000000b';
set local role authenticated;
select lives_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', '  New comment  ')$$, 'the commenter edits');
select is((select body from public.board_comments_page('aaaaaaaa-3300-0000-0000-000000000001', null, 50)), 'New comment', 'the comment is trimmed and saved');

-- ===== B: blocks between the commenter and the post author stop comment edits
reset role;
insert into public.member_blocks (blocker_id, blocked_id) values ('bbbbbbbb-3300-0000-0000-00000000000a', 'bbbbbbbb-3300-0000-0000-00000000000b');
set local role authenticated;
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', 'blocked edit')$$, 'P0002', null, 'a commenter blocked by the post author cannot edit their comment');
reset role;
delete from public.member_blocks where blocker_id = 'bbbbbbbb-3300-0000-0000-00000000000a' and blocked_id = 'bbbbbbbb-3300-0000-0000-00000000000b';
insert into public.member_blocks (blocker_id, blocked_id) values ('bbbbbbbb-3300-0000-0000-00000000000b', 'bbbbbbbb-3300-0000-0000-00000000000a');
set local role authenticated;
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', 'blocked edit')$$, 'P0002', null, 'a commenter who blocked the post author cannot edit their comment');
reset role;
delete from public.member_blocks where blocker_id = 'bbbbbbbb-3300-0000-0000-00000000000b' and blocked_id = 'bbbbbbbb-3300-0000-0000-00000000000a';
set local role authenticated;
select lives_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', 'New comment again')$$, 'after the blocks are removed the commenter can edit again');

-- ===== storage and create_board_post, as B
select lives_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000b.jpg')$$, 'a member adds a uuid-named picture in their own folder');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/1.jpg')$$, 'and a 1.jpg picture');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000c.jpg')$$, '42501', null, 'not in someone else''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000c.png')$$, '42501', null, 'not with another extension');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/not-a-uuid.jpg')$$, '42501', null, 'not with a non-uuid name');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000c.jpgX')$$, '42501', null, 'not with an extra suffix');
select is((select count(*) from storage.objects where bucket_id = 'board-images' and name = 'bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000b.jpg'), 1::bigint, 'the member sees their uuid-named picture');
select lives_ok($$select public.create_board_post('aaaaaaaa-3300-0000-0000-000000000003', 'showcase', 't', 'b', array['bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000003/cccccccc-3300-0000-0000-00000000000b.jpg','bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000003/1.jpg'])$$, 'create accepts a uuid-named and a 1.jpg picture');
select throws_ok($$select public.create_board_post(gen_random_uuid(), 'showcase', 't', 'b', array['bbbbbbbb-3300-0000-0000-00000000000b/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000b.jpg'])$$, '22023', null, 'create still refuses a path under another post id');

-- ===== C: the admin
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-3300-0000-0000-00000000000c","role":"authenticated"}', true);
select throws_ok($$select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 't', 'b', '{}')$$, 'P0002', null, 'an admin cannot edit the post');
select throws_ok($$select public.update_board_comment('dddddddd-3300-0000-0000-000000000001', 'x')$$, 'P0002', null, 'an admin cannot edit the comment');
select is((select can_edit from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), false, 'an admin is not offered post editing');
select is((select can_delete from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), true, 'but may delete the post');
select is((select can_edit from public.board_comments_page('aaaaaaaa-3300-0000-0000-000000000001', null, 50)), false, 'an admin is not offered comment editing');
select is((select can_delete from public.board_comments_page('aaaaaaaa-3300-0000-0000-000000000001', null, 50)), true, 'but may delete comments');

-- ===== A: removing every picture
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-3300-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select public.update_board_post('aaaaaaaa-3300-0000-0000-000000000001', 'T3', 'B3', '{}')), array['bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/cccccccc-3300-0000-0000-00000000000a.jpg','bbbbbbbb-3300-0000-0000-00000000000a/aaaaaaaa-3300-0000-0000-000000000001/2.jpg'], 'an empty picture list returns every previous path');
select is((select cardinality(images) from public.board_post('aaaaaaaa-3300-0000-0000-000000000001')), 0, 'and leaves the post without pictures');

-- ===== grants
reset role;
select ok(has_function_privilege('authenticated', 'public.board_post(uuid)', 'execute'), 'members may call board_post');
select ok(not has_function_privilege('anon', 'public.board_post(uuid)', 'execute'), 'visitors may not call board_post');
select ok(has_function_privilege('authenticated', 'public.board_comments_page(uuid,timestamptz,integer)', 'execute'), 'members may call board_comments_page');
select ok(not has_function_privilege('anon', 'public.board_comments_page(uuid,timestamptz,integer)', 'execute'), 'visitors may not call board_comments_page');
select ok(has_function_privilege('authenticated', 'public.update_board_post(uuid,text,text,text[])', 'execute'), 'members may call update_board_post');
select ok(not has_function_privilege('anon', 'public.update_board_post(uuid,text,text,text[])', 'execute'), 'visitors may not call update_board_post');
select ok(has_function_privilege('authenticated', 'public.update_board_comment(uuid,text)', 'execute'), 'members may call update_board_comment');
select ok(not has_function_privilege('anon', 'public.update_board_comment(uuid,text)', 'execute'), 'visitors may not call update_board_comment');

select * from finish();
rollback;
