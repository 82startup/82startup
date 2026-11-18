begin;
select plan(41);

-- A (author), B (other member), C (admin).
insert into auth.users (id, email) values
  ('bbbbbbbb-1100-0000-0000-00000000000a', 'a@board.test'),
  ('bbbbbbbb-1100-0000-0000-00000000000b', 'b@board.test'),
  ('bbbbbbbb-1100-0000-0000-00000000000c', 'c@board.test');
update public.profiles set name = 'Ann A', job_title = 'CEO', company_name = 'AnnCo' where id = 'bbbbbbbb-1100-0000-0000-00000000000a';
update public.profiles set name = 'Bob B' where id = 'bbbbbbbb-1100-0000-0000-00000000000b';
update public.profiles set name = 'Cat C', role = 'admin' where id = 'bbbbbbbb-1100-0000-0000-00000000000c';

-- ===== logged out
set local role anon;
select throws_ok($$select * from public.list_boards()$$, '42501', null, 'visitors cannot list boards');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 't', 'b', '{}')$$, '42501', null, 'visitors cannot post');

-- ===== A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-1100-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*) from public.list_boards()), 1::bigint, 'one board is listed');
select throws_ok($$select * from public.boards$$, '42501', null, 'members cannot read the boards table');
select throws_ok($$select * from public.board_posts$$, '42501', null, 'members cannot read the posts table');
select throws_ok($$insert into public.board_posts (board_id, author_id, title, body) values (gen_random_uuid(), 'bbbbbbbb-1100-0000-0000-00000000000a', 't', 'b')$$, '42501', null, 'members cannot write the posts table');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', E'  \n ', 'body', '{}')$$, '22023', null, 'an empty title is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', '   ', '{}')$$, '22023', null, 'an empty text is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', E'\u00a0', 'body', '{}')$$, '22023', null, 'a title of only a no-break space is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', E'\u200b', '{}')$$, '22023', null, 'a text of only a zero-width space is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', E'\u3000', 'body', '{}')$$, '22023', null, 'a title of only an ideographic space is refused');
reset role;
update public.profiles set name = '' where id = 'bbbbbbbb-1100-0000-0000-00000000000a';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-1100-0000-0000-00000000000a","role":"authenticated"}', true);
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', 'body', '{}')$$, '22023', null, 'a member without a name cannot post');
reset role;
update public.profiles set name = 'Ann A' where id = 'bbbbbbbb-1100-0000-0000-00000000000a';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-1100-0000-0000-00000000000a","role":"authenticated"}', true);
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', repeat('x', 121), 'body', '{}')$$, '22001', null, 'a title over 120 characters is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', repeat('x', 5001), '{}')$$, '22001', null, 'a text over 5000 characters is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'nope', 'title', 'body', '{}')$$, 'P0002', null, 'an unknown board is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', 'body', array['bbbbbbbb-1100-0000-0000-00000000000b/11111111-1111-1111-1111-111111111111/1.jpg'])$$, '22023', null, 'an image in someone else''s folder is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', 'body', array['bbbbbbbb-1100-0000-0000-00000000000a/22222222-2222-2222-2222-222222222222/1.jpg'])$$, '22023', null, 'an image under another post id is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', 'body', array['bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/1.jpg','bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/2.jpg','bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/3.jpg','bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/4.jpg','bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/1.jpg'])$$, '22023', null, 'five images are refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', 'body', array['bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/1.jpg','bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/1.jpg'])$$, '22023', null, 'the same image twice is refused');

select is(
  public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', '  Hello  ', '  First post  ',
    array['bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/1.jpg','bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/2.jpg']),
  '11111111-1111-1111-1111-111111111111'::uuid, 'a post is created and its id returned');
select is((select count(*) from public.board_posts_page('showcase', null, 20)), 1::bigint, 'the board lists it');
select is((select title from public.board_posts_page('showcase', null, 20) where id = '11111111-1111-1111-1111-111111111111'), 'Hello', 'the title is trimmed');
select is((select author_name from public.board_posts_page('showcase', null, 20)), 'Ann A', 'the author''s name comes with it');
select is((select can_delete from public.board_posts_page('showcase', null, 20)), true, 'the author may delete it');
select is((select title from public.board_post('11111111-1111-1111-1111-111111111111')), 'Hello', 'one post can be read by id');
select is((select count(*) from (select public.create_board_post(gen_random_uuid(), 'showcase', 't' || g, 'b', array[]::text[]) from generate_series(1, 4) g) s), 4::bigint, 'four more posts fit in the day');
select throws_ok($$select public.create_board_post(gen_random_uuid(), 'showcase', 'sixth', 'b', '{}')$$, 'P0001', null, 'the sixth post in 24 hours is refused');

-- storage: A's own folder only
select lives_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/1.jpg')$$, 'a member can add an image in their own folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-1100-0000-0000-00000000000b/11111111-1111-1111-1111-111111111111/1.jpg')$$, '42501', null, 'not in someone else''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/1.png')$$, '42501', null, 'not with another extension');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-images', 'bbbbbbbb-1100-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111/5.jpg')$$, '42501', null, 'not with a number above 4');

-- ===== B
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-1100-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select can_delete from public.board_posts_page('showcase', null, 20) where id = '11111111-1111-1111-1111-111111111111'), false, 'another member may not delete it');
select throws_ok($$select public.delete_board_post('11111111-1111-1111-1111-111111111111')$$, 'P0002', null, 'and cannot');

-- ===== C (admin)
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-1100-0000-0000-00000000000c","role":"authenticated"}', true);
select is(cardinality(public.delete_board_post('11111111-1111-1111-1111-111111111111')), 2, 'an admin deletes it and gets its two image paths back');
select is((select count(*) from public.board_post('11111111-1111-1111-1111-111111111111')), 0::bigint, 'it is gone');

-- ===== A deletes their own
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-1100-0000-0000-00000000000a","role":"authenticated"}', true);
select lives_ok($$select public.delete_board_post((select id from public.board_posts_page('showcase', null, 20) limit 1))$$, 'the author deletes their own post');

-- ===== bucket and grants
reset role;
select ok((select public from storage.buckets where id = 'board-images'), 'the bucket is public for reading');
select is((select file_size_limit from storage.buckets where id = 'board-images'), 512000::bigint, 'it refuses anything over 500 KB');
select is((select allowed_mime_types from storage.buckets where id = 'board-images'), array['image/jpeg'], 'and anything that is not a JPEG');
select ok(has_function_privilege('authenticated', 'public.create_board_post(uuid,text,text,text,text[])', 'execute'), 'members can call create_board_post');
select ok(not has_function_privilege('anon', 'public.create_board_post(uuid,text,text,text,text[])', 'execute'), 'visitors cannot');

select * from finish();
rollback;
