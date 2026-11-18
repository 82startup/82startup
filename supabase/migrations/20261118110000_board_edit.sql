-- Board editing: authors (only) edit their own posts and comments through functions; the lists learn `can_edit`;
-- picture names may now be random uuids (old posts keep 1-4.jpg) so a replaced picture never reuses an address.

-- Storage: widen the file part of the name.
drop policy "members add their own board images" on storage.objects;
drop policy "members see their own board images" on storage.objects;
drop policy "members delete their own board images" on storage.objects;
create policy "members add their own board images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'board-images'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([1-4]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$')
  );
create policy "members see their own board images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'board-images'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([1-4]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$')
  );
create policy "members delete their own board images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'board-images'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([1-4]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$')
  );

-- create_board_post: identical except the picture path check.
create or replace function public.create_board_post(p_id uuid, p_slug text, p_title text, p_body text, p_images text[])
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  board public.boards;
  clean_title text := regexp_replace(coalesce(p_title, ''), '^[\s  -​　﻿]+|[\s  -​　﻿]+$', '', 'g');
  clean_body text := regexp_replace(coalesce(p_body, ''), '^[\s  -​　﻿]+|[\s  -​　﻿]+$', '', 'g');
  paths text[] := coalesce(p_images, '{}');
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if coalesce((select pr.name from public.profiles pr where pr.id = uid), '') = '' then
    raise exception 'profile name is required' using errcode = '22023';
  end if;
  if p_id is null then
    raise exception 'post id is required' using errcode = '22023';
  end if;
  select * into board from public.boards b where b.slug = p_slug and b.is_active;
  if not found then
    raise exception 'board not found' using errcode = 'P0002';
  end if;
  if clean_title = '' or clean_body = '' then
    raise exception 'title and text are required' using errcode = '22023';
  end if;
  if char_length(clean_title) > 120 or char_length(clean_body) > 5000 then
    raise exception 'too long' using errcode = '22001';
  end if;
  if cardinality(paths) > 0 and not board.allow_images then
    raise exception 'this board does not take images' using errcode = '22023';
  end if;
  if cardinality(paths) > 4 or (select count(distinct i) from unnest(paths) i) <> cardinality(paths) then
    raise exception 'too many or repeated images' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(paths) i where i !~ ('^' || uid::text || '/' || p_id::text || '/([1-4]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$')) then
    raise exception 'image path is not allowed' using errcode = '22023';
  end if;
  if (select count(*) from public.board_posts p where p.board_id = board.id and p.author_id = uid and p.created_at > now() - interval '24 hours') >= board.post_limit_per_day then
    raise exception 'too many posts' using errcode = 'P0001';
  end if;
  insert into public.board_posts (id, board_id, author_id, title, body, images)
  values (p_id, board.id, uid, clean_title, clean_body, paths);
  return p_id;
end
$$;

-- Author-only. Returns the picture paths that were dropped so the application can delete the files.
create function public.update_board_post(p_id uuid, p_title text, p_body text, p_images text[])
returns text[]
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  post public.board_posts;
  board public.boards;
  clean_title text := regexp_replace(coalesce(p_title, ''), '^[\s  -​　﻿]+|[\s  -​　﻿]+$', '', 'g');
  clean_body text := regexp_replace(coalesce(p_body, ''), '^[\s  -​　﻿]+|[\s  -​　﻿]+$', '', 'g');
  paths text[] := coalesce(p_images, '{}');
  removed text[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select * into post from public.board_posts p where p.id = p_id and p.author_id = uid;
  if not found then
    raise exception 'post not found' using errcode = 'P0002';
  end if;
  select * into board from public.boards b where b.id = post.board_id and b.is_active;
  if not found then
    raise exception 'board not found' using errcode = 'P0002';
  end if;
  if coalesce((select pr.name from public.profiles pr where pr.id = uid), '') = '' then
    raise exception 'profile name is required' using errcode = '22023';
  end if;
  if clean_title = '' or clean_body = '' then
    raise exception 'title and text are required' using errcode = '22023';
  end if;
  if char_length(clean_title) > 120 or char_length(clean_body) > 5000 then
    raise exception 'too long' using errcode = '22001';
  end if;
  if cardinality(paths) > 0 and not board.allow_images then
    raise exception 'this board does not take images' using errcode = '22023';
  end if;
  if cardinality(paths) > 4 or (select count(distinct i) from unnest(paths) i) <> cardinality(paths) then
    raise exception 'too many or repeated images' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(paths) i where i !~ ('^' || uid::text || '/' || p_id::text || '/([1-4]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$')) then
    raise exception 'image path is not allowed' using errcode = '22023';
  end if;
  select coalesce(array_agg(o), '{}') into removed from unnest(post.images) o where o <> all (paths);
  update public.board_posts p set title = clean_title, body = clean_body, images = paths where p.id = p_id;
  return removed;
end
$$;

-- Author-only.
create function public.update_board_comment(p_id uuid, p_body text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_body text := regexp_replace(coalesce(p_body, ''), '^[\s  -​　﻿]+|[\s  -​　﻿]+$', '', 'g');
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if coalesce((select pr.name from public.profiles pr where pr.id = uid), '') = '' then
    raise exception 'profile name is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.board_comments c
    join public.board_posts p on p.id = c.post_id
    join public.boards b on b.id = p.board_id
    where c.id = p_id and c.author_id = uid and b.is_active
  ) then
    raise exception 'comment not found' using errcode = 'P0002';
  end if;
  if clean_body = '' then
    raise exception 'comment is empty' using errcode = '22023';
  end if;
  if char_length(clean_body) > 1000 then
    raise exception 'comment is too long' using errcode = '22001';
  end if;
  update public.board_comments c set body = clean_body where c.id = p_id;
end
$$;

-- The lists gain a final can_edit column (author only; admins may delete but not edit).
drop function public.board_post(uuid);
create function public.board_post(p_id uuid)
returns table (id uuid, title text, body text, images text[], comment_count integer, created_at timestamptz,
               author_id uuid, author_name text, author_job_title text, author_company text, author_avatar text, can_delete boolean,
               can_edit boolean)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.title, p.body, p.images, p.comment_count, p.created_at,
         p.author_id, pr.name, pr.job_title, pr.company_name, pr.avatar_url,
         (p.author_id = (select auth.uid()) or public.is_admin()),
         (p.author_id = (select auth.uid()))
  from public.board_posts p
  join public.boards b on b.id = p.board_id
  join public.profiles pr on pr.id = p.author_id
  where (select auth.uid()) is not null and p.id = p_id and b.is_active
$$;

drop function public.board_comments_page(uuid, timestamptz, integer);
create function public.board_comments_page(p_post uuid, p_after timestamptz, p_limit integer)
returns table (id uuid, body text, created_at timestamptz, author_id uuid, author_name text, author_job_title text,
               author_company text, author_avatar text, can_delete boolean, can_edit boolean)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.body, c.created_at, c.author_id, pr.name, pr.job_title, pr.company_name, pr.avatar_url,
         (c.author_id = (select auth.uid()) or public.is_admin()),
         (c.author_id = (select auth.uid()))
  from public.board_comments c
  join public.board_posts p on p.id = c.post_id
  join public.boards b on b.id = p.board_id
  join public.profiles pr on pr.id = c.author_id
  where (select auth.uid()) is not null
    and c.post_id = p_post and b.is_active
    and (p_after is null or c.created_at > p_after)
  order by c.created_at, c.id
  limit least(greatest(coalesce(p_limit, 50), 1), 50)
$$;

revoke all on function public.board_post(uuid) from public, anon, authenticated, service_role;
revoke all on function public.board_comments_page(uuid, timestamptz, integer) from public, anon, authenticated, service_role;
revoke all on function public.update_board_post(uuid, text, text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.update_board_comment(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.board_post(uuid) to authenticated;
grant execute on function public.board_comments_page(uuid, timestamptz, integer) to authenticated;
grant execute on function public.update_board_post(uuid, text, text, text[]) to authenticated;
grant execute on function public.update_board_comment(uuid, text) to authenticated;
