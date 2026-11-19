-- Sidebar badge for boards: comments by other members on my posts that I have not seen yet. Opening my post marks it seen.
create table public.board_post_seen (
  member_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.board_posts (id) on delete cascade,
  seen_at timestamptz not null default clock_timestamp(),
  primary key (member_id, post_id)
);
alter table public.board_post_seen enable row level security;
revoke all on public.board_post_seen from public, anon, authenticated, service_role;

-- Only the post's author is recorded; anyone else opening the post changes nothing.
create function public.mark_board_post_seen(p_post uuid)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.board_post_seen (member_id, post_id, seen_at)
  select (select auth.uid()), p.id, clock_timestamp()
  from public.board_posts p
  where (select auth.uid()) is not null and p.id = p_post and p.author_id = (select auth.uid())
  on conflict (member_id, post_id) do update set seen_at = excluded.seen_at
$$;

-- One row per active board that has unseen comments on my posts.
create function public.unseen_board_comment_counts()
returns table (slug text, unseen integer)
language sql stable security definer
set search_path = ''
as $$
  select b.slug, count(*)::integer
  from public.board_comments c
  join public.board_posts p on p.id = c.post_id
  join public.boards b on b.id = p.board_id
  left join public.board_post_seen s on s.post_id = p.id and s.member_id = p.author_id
  where (select auth.uid()) is not null
    and p.author_id = (select auth.uid())
    and c.author_id <> p.author_id
    and b.is_active
    and c.created_at > coalesce(s.seen_at, '-infinity'::timestamptz)
  group by b.slug
$$;

revoke all on function public.mark_board_post_seen(uuid) from public, anon, authenticated, service_role;
revoke all on function public.unseen_board_comment_counts() from public, anon, authenticated, service_role;
grant execute on function public.mark_board_post_seen(uuid) to authenticated;
grant execute on function public.unseen_board_comment_counts() to authenticated;
