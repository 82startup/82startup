-- Board editing follow-ups: a blocked (or blocking) comment author cannot edit their comment, and a post edit locks its row.

-- Author-only. Returns the picture paths that were dropped so the application can delete the files.
-- Identical to the previous version except `for update` on the post lookup, so concurrent edits serialise.
create or replace function public.update_board_post(p_id uuid, p_title text, p_body text, p_images text[])
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
  select * into post from public.board_posts p where p.id = p_id and p.author_id = uid for update;
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

-- Author-only, and not across a block (either direction) between the comment author and the post author.
create or replace function public.update_board_comment(p_id uuid, p_body text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  post_author uuid;
  clean_body text := regexp_replace(coalesce(p_body, ''), '^[\s  -​　﻿]+|[\s  -​　﻿]+$', '', 'g');
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if coalesce((select pr.name from public.profiles pr where pr.id = uid), '') = '' then
    raise exception 'profile name is required' using errcode = '22023';
  end if;
  select p.author_id into post_author
  from public.board_comments c
  join public.board_posts p on p.id = c.post_id
  join public.boards b on b.id = p.board_id
  where c.id = p_id and c.author_id = uid and b.is_active;
  if not found or public.is_blocked_either_way(uid, post_author) then
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

revoke all on function public.update_board_post(uuid, text, text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.update_board_comment(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.update_board_post(uuid, text, text, text[]) to authenticated;
grant execute on function public.update_board_comment(uuid, text) to authenticated;
