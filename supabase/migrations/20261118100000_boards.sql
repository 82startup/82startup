-- Community boards. A board is a row; posts (and, in the second half of this file, comments) belong to a board. Every table
-- is closed: members reach data only through the functions below. Production has no default grants, so each one is given explicitly.
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  allow_images boolean not null default true,
  post_limit_per_day integer not null default 5 check (post_limit_per_day between 1 and 100)
);
alter table public.boards enable row level security;
revoke all on public.boards from public, anon, authenticated, service_role;

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  comment_count integer not null default 0,
  created_at timestamptz not null default clock_timestamp()
);
create index board_posts_board_idx on public.board_posts (board_id, created_at desc, id);
create index board_posts_author_idx on public.board_posts (author_id, created_at desc);
alter table public.board_posts enable row level security;
revoke all on public.board_posts from public, anon, authenticated, service_role;

insert into public.boards (slug, title, description, sort_order) values
  ('showcase', 'Startup Showcase', '82 Startup 멤버의 스타트업을 소개하고 소식을 나누는 공간이에요.', 10);

-- Images: a public bucket (read by address) that refuses anything over 500 KB or not a JPEG. A member may add, see and delete only
-- <their id>/<post uuid>/<1-4>.jpg; there is no update rule, so nothing can be overwritten.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-images', 'board-images', true, 512000, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 512000, allowed_mime_types = array['image/jpeg'];

create policy "members add their own board images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'board-images'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-4]\.jpg$')
  );
create policy "members see their own board images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'board-images'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-4]\.jpg$')
  );
create policy "members delete their own board images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'board-images'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-4]\.jpg$')
  );

create function public.list_boards()
returns table (slug text, title text, description text)
language sql stable security definer
set search_path = ''
as $$
  select b.slug, b.title, b.description
  from public.boards b
  where (select auth.uid()) is not null and b.is_active
  order by b.sort_order, b.title
$$;

create function public.board_posts_page(p_slug text, p_before timestamptz, p_limit integer)
returns table (id uuid, title text, body text, images text[], comment_count integer, created_at timestamptz,
               author_id uuid, author_name text, author_job_title text, author_company text, author_avatar text, can_delete boolean)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.title, p.body, p.images, p.comment_count, p.created_at,
         p.author_id, pr.name, pr.job_title, pr.company_name, pr.avatar_url,
         (p.author_id = (select auth.uid()) or public.is_admin())
  from public.board_posts p
  join public.boards b on b.id = p.board_id
  join public.profiles pr on pr.id = p.author_id
  where (select auth.uid()) is not null
    and b.slug = p_slug and b.is_active
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 20)
$$;

create function public.board_post(p_id uuid)
returns table (id uuid, title text, body text, images text[], comment_count integer, created_at timestamptz,
               author_id uuid, author_name text, author_job_title text, author_company text, author_avatar text, can_delete boolean)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.title, p.body, p.images, p.comment_count, p.created_at,
         p.author_id, pr.name, pr.job_title, pr.company_name, pr.avatar_url,
         (p.author_id = (select auth.uid()) or public.is_admin())
  from public.board_posts p
  join public.boards b on b.id = p.board_id
  join public.profiles pr on pr.id = p.author_id
  where (select auth.uid()) is not null and p.id = p_id and b.is_active
$$;

create function public.create_board_post(p_id uuid, p_slug text, p_title text, p_body text, p_images text[])
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
  if exists (select 1 from unnest(paths) i where i !~ ('^' || uid::text || '/' || p_id::text || '/[1-4]\.jpg$')) then
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

-- Returns the removed post's image paths so the application can delete the files too.
create function public.delete_board_post(p_id uuid)
returns text[]
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  removed text[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from public.board_posts p
  where p.id = p_id and (p.author_id = uid or public.is_admin())
  returning p.images into removed;
  if not found then
    raise exception 'post not found' using errcode = 'P0002';
  end if;
  return removed;
end
$$;

revoke all on function public.list_boards() from public, anon, authenticated, service_role;
revoke all on function public.board_posts_page(text, timestamptz, integer) from public, anon, authenticated, service_role;
revoke all on function public.board_post(uuid) from public, anon, authenticated, service_role;
revoke all on function public.create_board_post(uuid, text, text, text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.delete_board_post(uuid) from public, anon, authenticated, service_role;
grant execute on function public.list_boards() to authenticated;
grant execute on function public.board_posts_page(text, timestamptz, integer) to authenticated;
grant execute on function public.board_post(uuid) to authenticated;
grant execute on function public.create_board_post(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.delete_board_post(uuid) to authenticated;
