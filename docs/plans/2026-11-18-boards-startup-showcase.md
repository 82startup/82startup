# Community Boards (Startup Showcase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a members-only board system to the community, launching with one board, "Startup Showcase", where members post free-form text with up to 4 images and comment.

**Architecture:** Boards are rows in a `boards` table; posts and comments belong to a board. All three tables are closed (no direct access) and reached through `security definer` SQL functions, like the rest of the community. One route, `/boards/[slug]`, serves every board, and the left menu is built from `list_boards()`, so a new board is one inserted row. Phase 1 ships boards, posts, images, delete and the access wiring; phase 2 ships the comment UI.

**Tech Stack:** Next.js 16 (App Router, Cache Components, Turbopack), React 19, Supabase (Postgres, Storage, pgTAP), Vitest, plain CSS in `src/app/globals.css`.

**Spec:** `docs/specs/2026-11-18-boards-startup-showcase.md`

## Global Constraints

- Work on a branch: `git switch -c boards` before Task 1. Commits are **local only**; never push, never apply the migration to production, never deploy (project rule: wait for an explicit request).
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (dynamic routes, server actions, `PageProps`). `params` and `searchParams` are async: `await` them. Dynamic data lives inside `<Suspense>` after `await connection()`, exactly as `src/app/members/page.tsx` does.
- Every new table is closed: `enable row level security` and `revoke all ... from public, anon, authenticated, service_role`. Every function is `security definer`, `set search_path = ''`, refuses without a session (errcode `28000`), has `revoke all ... from public, anon, authenticated, service_role` and an explicit `grant execute ... to authenticated`. Production has no default grants.
- Names use the `board` prefix; never touch `public.posts`, `create_post`, `post-box.tsx` or `/messages`.
- Limits (verbatim from the spec): title 1 to 120 characters, post text 1 to 5,000, comment 1 to 1,000 (all after trimming every kind of whitespace at both ends); at most 4 images per post; images JPEG only, 500 KB per file in the bucket, resized in the browser to at most 1,600 px on the long side; 5 posts per 24 hours per board (`boards.post_limit_per_day`); 30 comments per member per hour. Plain text only.
- Error codes: `28000` not signed in, `22023` invalid input, `22001` too long, `P0002` not found (or not allowed to delete), `P0001` rate limit.
- Image paths are exactly `<author id>/<post id>/<1-4>.jpg` in public bucket `board-images`.
- Delete is allowed for the author and for admins (`is_admin()`); the post author cannot delete someone else's comment. No editing in this version.
- UI: reuse `.community-action`, `.community-action-secondary`, `.action-quiet`; palette `--community-paper #f6f5ed`, `--community-charcoal #24251f`, `--community-yellow #f0fa4b`; no focus outlines or rings; never use `border-left` or inset stripes as accent lines; save and error results use `src/components/toast.tsx`, field errors stay beside their fields.
- Access wiring is mandatory (Task 4): `isCommunityRoute` in `src/components/app-chrome.tsx`, `MEMBERS_ONLY` in `src/lib/supabase/proxy.ts`, `disallow` in `src/app/robots.ts`.
- `src/app/globals.css` edits are not picked up by a running `next dev`: stop it, delete `.next/dev` and `.next/cache`, start again. Never run `npm run build` while dev is serving this folder.
- Local database: `supabase start && ./scripts/dev-env.sh` once per session (ports 55321 to 55324). After editing the migration run `supabase db reset` (local data only), then `npm run test:db`.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261118100000_boards.sql` (create) | Tables, functions, storage bucket and policies, seed board. Built across Tasks 1 and 2. |
| `supabase/tests/boards.test.sql`, `supabase/tests/board_comments.test.sql` (create) | pgTAP tests for access rules, limits, grants, storage. |
| `src/lib/boards/form.ts` (create) | Limits and the three trim-and-validate functions. |
| `src/lib/boards/images.ts` (create) | Bucket name, image limits, path helpers, public URL, `fitWithin`. |
| `src/lib/boards/resize.ts` (create) | Browser only: resize a picked file to a small JPEG blob. |
| `src/lib/boards/types.ts` (create) | Row types returned by the SQL functions. |
| `src/lib/boards/format.ts` (create) | `formatPostDate`, `previewText`. |
| `src/lib/boards/queries.ts` (create) | Server-side readers and `requireViewer`. |
| `src/components/navigation.ts` (create) | `buildNavigation(boards)`: the ordered menu with markers. |
| `src/components/app-chrome.tsx` (modify) | Menu from `list_boards`; `boards` in `isCommunityRoute`. |
| `src/lib/supabase/proxy.ts`, `src/app/robots.ts` (modify) | Members-only gate and crawler rule for `/boards`. |
| `src/lib/copy.ts` (modify) | `copy.boards` strings. |
| `src/app/boards/actions.ts` (create) | Server actions `createBoardPost`, `deleteBoardPost`. |
| `src/app/boards/comment-actions.ts` (create, phase 2) | `createBoardComment`, `deleteBoardComment`. |
| `src/app/boards/[slug]/page.tsx`, `post-card.tsx` (create) | Post list and card. |
| `src/app/boards/[slug]/new/page.tsx`, `new-post-form.tsx` (create) | New post screen and client form. |
| `src/app/boards/[slug]/[postId]/page.tsx`, `delete-post-button.tsx` (create) | Post detail and delete. |
| `src/app/boards/[slug]/[postId]/comments.tsx`, `comment-form.tsx`, `delete-comment-button.tsx` (create, phase 2) | Comment UI. |
| `src/app/globals.css` (modify) | Board styles, appended per task. |
| `AGENTS.md`, `README.md`, spec (modify) | Documentation. |

---

## Phase 1

### Task 1: Database: boards, posts, images (tests first)

**Files:**
- Create: `supabase/tests/boards.test.sql`
- Create: `supabase/migrations/20261118100000_boards.sql`

**Interfaces:**
- Produces (SQL, all `authenticated` only):
  - `list_boards() returns table (slug text, title text, description text)`
  - `board_posts_page(p_slug text, p_before timestamptz, p_limit integer) returns table (id uuid, title text, body text, images text[], comment_count integer, created_at timestamptz, author_id uuid, author_name text, author_job_title text, author_company text, author_avatar text, can_delete boolean)`
  - `board_post(p_id uuid) returns table (...same columns...)`
  - `create_board_post(p_id uuid, p_slug text, p_title text, p_body text, p_images text[]) returns uuid` (`p_id` is chosen by the browser because the image paths contain it)
  - `delete_board_post(p_id uuid) returns text[]` (the removed post's image paths, so the app can delete the files)
  - bucket `board-images`; seeded board slug `showcase`.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/boards.test.sql`:

```sql
begin;
select plan(37);

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
select throws_ok($$insert into public.board_posts (board_id, author_id, title, body) select id, 'bbbbbbbb-1100-0000-0000-00000000000a', 't', 'b' from public.boards$$, '42501', null, 'members cannot write the posts table');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', E'  \n ', 'body', '{}')$$, '22023', null, 'an empty title is refused');
select throws_ok($$select public.create_board_post('11111111-1111-1111-1111-111111111111', 'showcase', 'title', '   ', '{}')$$, '22023', null, 'an empty text is refused');
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `supabase db reset && npm run test:db -- supabase/tests/boards.test.sql`
Expected: FAIL (errors such as `function public.list_boards() does not exist` and a plan mismatch).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261118100000_boards.sql`:

```sql
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
  clean_title text := regexp_replace(coalesce(p_title, ''), '^\s+|\s+$', '', 'g');
  clean_body text := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');
  paths text[] := coalesce(p_images, '{}');
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `supabase db reset && npm run test:db`
Expected: PASS for `boards.test.sql` (37 of 37) and for every existing file. If only the plan count is off, correct the `plan(37)` number to the real count; do not change assertions to make them pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261118100000_boards.sql supabase/tests/boards.test.sql
git commit -m "Add boards and board posts: tables, functions, image bucket, tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Database: comments (appended to the same migration)

**Files:**
- Modify: `supabase/migrations/20261118100000_boards.sql` (append; not applied anywhere but local yet)
- Create: `supabase/tests/board_comments.test.sql`

**Interfaces:**
- Consumes: `board_posts`, `boards`, `is_admin()` from Task 1.
- Produces (SQL, `authenticated` only):
  - `board_comments_page(p_post uuid, p_after timestamptz, p_limit integer) returns table (id uuid, body text, created_at timestamptz, author_id uuid, author_name text, author_job_title text, author_company text, author_avatar text, can_delete boolean)`, oldest first, at most 50.
  - `create_board_comment(p_post uuid, p_body text) returns uuid`
  - `delete_board_comment(p_id uuid) returns void`

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/board_comments.test.sql`:

```sql
begin;
select plan(21);

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

-- ===== cascade and grants
reset role;
delete from public.board_posts where id = '33333333-3333-3333-3333-333333333333';
select is((select count(*) from public.board_comments), 0::bigint, 'deleting a post deletes its comments');
select ok(has_function_privilege('authenticated', 'public.create_board_comment(uuid,text)', 'execute'), 'members can call create_board_comment');
select ok(not has_function_privilege('anon', 'public.create_board_comment(uuid,text)', 'execute'), 'visitors cannot');

select * from finish();
rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `supabase db reset && npm run test:db -- supabase/tests/board_comments.test.sql`
Expected: FAIL (`function public.create_board_comment(uuid, unknown) does not exist`, relation `board_comments` missing).

- [ ] **Step 3: Append the comment half to the migration**

Append to `supabase/migrations/20261118100000_boards.sql`:

```sql

-- Comments. Oldest first; at most 30 per member per hour; deleted by their author or an admin.
create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default clock_timestamp()
);
create index board_comments_post_idx on public.board_comments (post_id, created_at, id);
create index board_comments_author_idx on public.board_comments (author_id, created_at desc);
alter table public.board_comments enable row level security;
revoke all on public.board_comments from public, anon, authenticated, service_role;

create function public.board_comments_page(p_post uuid, p_after timestamptz, p_limit integer)
returns table (id uuid, body text, created_at timestamptz, author_id uuid, author_name text, author_job_title text,
               author_company text, author_avatar text, can_delete boolean)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.body, c.created_at, c.author_id, pr.name, pr.job_title, pr.company_name, pr.avatar_url,
         (c.author_id = (select auth.uid()) or public.is_admin())
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

create function public.create_board_comment(p_post uuid, p_body text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_body text := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');
  new_id uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.board_posts p join public.boards b on b.id = p.board_id where p.id = p_post and b.is_active) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;
  if clean_body = '' then
    raise exception 'comment is empty' using errcode = '22023';
  end if;
  if char_length(clean_body) > 1000 then
    raise exception 'comment is too long' using errcode = '22001';
  end if;
  if (select count(*) from public.board_comments c where c.author_id = uid and c.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many comments' using errcode = 'P0001';
  end if;
  insert into public.board_comments (post_id, author_id, body) values (p_post, uid, clean_body) returning id into new_id;
  update public.board_posts p set comment_count = p.comment_count + 1 where p.id = p_post;
  return new_id;
end
$$;

create function public.delete_board_comment(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  owner_post uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from public.board_comments c
  where c.id = p_id and (c.author_id = uid or public.is_admin())
  returning c.post_id into owner_post;
  if not found then
    raise exception 'comment not found' using errcode = 'P0002';
  end if;
  update public.board_posts p set comment_count = greatest(p.comment_count - 1, 0) where p.id = owner_post;
end
$$;

revoke all on function public.board_comments_page(uuid, timestamptz, integer) from public, anon, authenticated, service_role;
revoke all on function public.create_board_comment(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.delete_board_comment(uuid) from public, anon, authenticated, service_role;
grant execute on function public.board_comments_page(uuid, timestamptz, integer) to authenticated;
grant execute on function public.create_board_comment(uuid, text) to authenticated;
grant execute on function public.delete_board_comment(uuid) to authenticated;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `supabase db reset && npm run test:db`
Expected: PASS everywhere (`board_comments.test.sql` 21 of 21).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261118100000_boards.sql supabase/tests/board_comments.test.sql
git commit -m "Add board comments: table, functions, tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Board library (form rules, image helpers, format)

**Files:**
- Create: `src/lib/boards/form.ts`, `src/lib/boards/form.test.ts`
- Create: `src/lib/boards/images.ts`, `src/lib/boards/images.test.ts`
- Create: `src/lib/boards/format.ts`, `src/lib/boards/format.test.ts`
- Create: `src/lib/boards/types.ts`, `src/lib/boards/resize.ts`

**Interfaces:**
- Produces:
  - `form.ts`: `TITLE_MAX = 120`, `BODY_MAX = 5000`, `COMMENT_MAX = 1000`, `MAX_IMAGES = 4`; `cleanTitle(v: string): string | null`, `cleanBody(v: string): string | null`, `cleanComment(v: string): string | null` (trimmed text, or null when empty or too long, counting code points).
  - `images.ts`: `BOARD_IMAGE_BUCKET = "board-images"`, `BOARD_IMAGE_MAX_BYTES = 512000`, `BOARD_IMAGE_TARGET_BYTES = 400 * 1024`, `BOARD_IMAGE_MAX_SIDE = 1600`; `boardImagePath(userId, postId, n): string`; `isOwnBoardImagePath(path, userId, postId): boolean`; `isBoardImagePath(path): boolean`; `boardImagePublicUrl(baseUrl, path): string | null`; `fitWithin(width, height, max): { width: number; height: number }`.
  - `resize.ts`: `makeBoardImageBlob(file: File): Promise<Blob>` (throws `PhotoError` from `@/lib/profile/resize`).
  - `format.ts`: `formatPostDate(iso: string): string` ("Nov 18, 2026"), `previewText(body: string, max: number): string`.
  - `types.ts`: `BoardSummary`, `BoardPostRow`, `BoardCommentRow`.

- [ ] **Step 1: Write the failing tests**

`src/lib/boards/form.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cleanBody, cleanComment, cleanTitle } from "./form";

describe("board form rules", () => {
  it("trims every kind of whitespace at both ends", () => {
    expect(cleanTitle("  \n Hello \t ")).toBe("Hello");
    expect(cleanBody("  text  ")).toBe("text");
  });
  it("refuses empty text", () => {
    expect(cleanTitle("   ")).toBeNull();
    expect(cleanBody("")).toBeNull();
    expect(cleanComment("\n")).toBeNull();
  });
  it("allows the limit and refuses one more, counting characters not bytes", () => {
    expect(cleanTitle("x".repeat(120))).not.toBeNull();
    expect(cleanTitle("x".repeat(121))).toBeNull();
    expect(cleanTitle("한".repeat(120))).not.toBeNull();
    expect(cleanBody("x".repeat(5000))).not.toBeNull();
    expect(cleanBody("x".repeat(5001))).toBeNull();
    expect(cleanComment("x".repeat(1000))).not.toBeNull();
    expect(cleanComment("x".repeat(1001))).toBeNull();
    expect(cleanTitle("😀".repeat(120))).not.toBeNull();
  });
});
```

`src/lib/boards/images.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { boardImagePath, boardImagePublicUrl, fitWithin, isBoardImagePath, isOwnBoardImagePath } from "./images";

const USER = "bbbbbbbb-1100-0000-0000-00000000000a";
const POST = "11111111-1111-1111-1111-111111111111";
const BASE = "http://127.0.0.1:55321";

describe("board image paths", () => {
  it("builds <user>/<post>/<n>.jpg", () => {
    expect(boardImagePath(USER, POST, 2)).toBe(`${USER}/${POST}/2.jpg`);
  });
  it("accepts only the member's own folder and post, numbered 1 to 4", () => {
    expect(isOwnBoardImagePath(`${USER}/${POST}/4.jpg`, USER, POST)).toBe(true);
    expect(isOwnBoardImagePath(`${USER}/${POST}/5.jpg`, USER, POST)).toBe(false);
    expect(isOwnBoardImagePath(`${USER}/${POST}/1.png`, USER, POST)).toBe(false);
    expect(isOwnBoardImagePath(`${USER}/22222222-2222-2222-2222-222222222222/1.jpg`, USER, POST)).toBe(false);
    expect(isOwnBoardImagePath(`bbbbbbbb-1100-0000-0000-00000000000b/${POST}/1.jpg`, USER, POST)).toBe(false);
  });
  it("recognises any well-formed path", () => {
    expect(isBoardImagePath(`${USER}/${POST}/3.jpg`)).toBe(true);
    expect(isBoardImagePath("https://evil.test/x.jpg")).toBe(false);
    expect(isBoardImagePath(`${USER}/${POST}/../1.jpg`)).toBe(false);
  });
  it("builds the public address only for a well-formed path", () => {
    expect(boardImagePublicUrl(`${BASE}/`, `${USER}/${POST}/1.jpg`)).toBe(`${BASE}/storage/v1/object/public/board-images/${USER}/${POST}/1.jpg`);
    expect(boardImagePublicUrl(BASE, "https://evil.test/x.jpg")).toBeNull();
  });
});

describe("fitWithin", () => {
  it("shrinks the long side to the limit and keeps the ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3000, 1600)).toEqual({ width: 533, height: 1600 });
  });
  it("never enlarges", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
```

`src/lib/boards/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatPostDate, previewText } from "./format";

describe("board formatting", () => {
  it("formats a date in UTC", () => {
    expect(formatPostDate("2026-11-18T23:30:00Z")).toBe("Nov 18, 2026");
  });
  it("collapses whitespace in a preview and cuts long text with an ellipsis", () => {
    expect(previewText("a \n\n b   c", 50)).toBe("a b c");
    expect(previewText("x".repeat(10), 5)).toBe("xxxx…");
    expect(previewText("short", 5)).toBe("short");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/boards`
Expected: FAIL (`Failed to resolve import "./form"` and the same for `./images`, `./format`).

- [ ] **Step 3: Write the implementation**

`src/lib/boards/form.ts`:

```ts
export const TITLE_MAX = 120;
export const BODY_MAX = 5000;
export const COMMENT_MAX = 1000;
export const MAX_IMAGES = 4;

// Trim every kind of whitespace at both ends (as the database does), then check the length in characters.
function clean(value: string, max: number): string | null {
  const text = value.replace(/^\s+|\s+$/g, "");
  return text === "" || [...text].length > max ? null : text;
}

export const cleanTitle = (value: string) => clean(value, TITLE_MAX);
export const cleanBody = (value: string) => clean(value, BODY_MAX);
export const cleanComment = (value: string) => clean(value, COMMENT_MAX);
```

`src/lib/boards/images.ts`:

```ts
export const BOARD_IMAGE_BUCKET = "board-images";
export const BOARD_IMAGE_MAX_BYTES = 512000; // what the bucket accepts (500 KB)
export const BOARD_IMAGE_TARGET_BYTES = 400 * 1024; // what the browser aims for
export const BOARD_IMAGE_MAX_SIDE = 1600; // pixels, the long side

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ANY_PATH = new RegExp(`^${UUID}/${UUID}/[1-4]\\.jpg$`);

export function boardImagePath(userId: string, postId: string, n: number): string {
  return `${userId}/${postId}/${n}.jpg`;
}

// Exactly <own account id>/<this post id>/<1-4>.jpg: the only shape a member may store for a post.
export function isOwnBoardImagePath(path: string, userId: string, postId: string): boolean {
  return new RegExp(`^${userId}/${postId}/[1-4]\\.jpg$`).test(path);
}

export function isBoardImagePath(path: string): boolean {
  return ANY_PATH.test(path);
}

// The public address of a stored image, or null for anything that is not one of our paths.
export function boardImagePublicUrl(baseUrl: string, path: string): string | null {
  if (!isBoardImagePath(path)) return null;
  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BOARD_IMAGE_BUCKET}/${path}`;
}

// Scale a picture down so its long side is at most `max`, keeping the ratio. Never enlarges.
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const scale = max / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
```

`src/lib/boards/format.ts`:

```ts
export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// The first `max` characters of a text on one line, with an ellipsis when it was cut.
export function previewText(body: string, max: number): string {
  const text = body.replace(/\s+/g, " ").trim();
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}
```

`src/lib/boards/types.ts`:

```ts
export type BoardSummary = { slug: string; title: string; description: string };

type Author = {
  author_id: string;
  author_name: string;
  author_job_title: string;
  author_company: string;
  author_avatar: string | null;
};

export type BoardPostRow = Author & {
  id: string;
  title: string;
  body: string;
  images: string[];
  comment_count: number;
  created_at: string;
  can_delete: boolean;
};

export type BoardCommentRow = Author & {
  id: string;
  body: string;
  created_at: string;
  can_delete: boolean;
};
```

`src/lib/boards/resize.ts` (browser only; not unit tested, covered by manual check in Task 10):

```ts
// Browser only. Draws the picked picture at most 1,600 px on the long side and saves it as a JPEG under 500 KB.
// Drawing it again also drops the camera's hidden data (location, device). The original is never uploaded.
import { FIRST_QUALITY, nextQuality } from "@/lib/profile/photo";
import { PhotoError } from "@/lib/profile/resize";
import { BOARD_IMAGE_MAX_BYTES, BOARD_IMAGE_MAX_SIDE, BOARD_IMAGE_TARGET_BYTES, fitWithin } from "./images";

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function makeBoardImageBlob(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("decode");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, BOARD_IMAGE_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoError("decode");
  context.fillStyle = "#ffffff"; // JPEG has no transparency
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality: number | null = FIRST_QUALITY;
  let last: Blob | null = null;
  while (quality !== null) {
    const blob = await toBlob(canvas, quality);
    if (!blob) throw new PhotoError("decode");
    last = blob;
    if (blob.size <= BOARD_IMAGE_TARGET_BYTES) return blob;
    quality = nextQuality(quality);
  }
  if (last && last.size <= BOARD_IMAGE_MAX_BYTES) return last;
  throw new PhotoError("tooBig");
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/boards && npx tsc --noEmit`
Expected: PASS (all tests in the three files) and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/boards
git commit -m "Add board library: form rules, image paths, formatting, types

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Access wiring (members-only and no indexing)

**Files:**
- Modify: `src/lib/supabase/proxy.ts` (the `MEMBERS_ONLY` regex)
- Modify: `src/app/robots.ts` (the `disallow` array)
- Modify: `src/components/app-chrome.tsx` (the `isCommunityRoute` regex)
- Modify: `src/lib/supabase/proxy.test.ts`, `src/lib/site/seo.test.ts`

**Interfaces:**
- Consumes: nothing new. Produces: `/boards` and everything under it are members-only, uncrawlable and render inside the community shell.

- [ ] **Step 1: Write the failing tests**

In `src/lib/supabase/proxy.test.ts`, add two rows to the list in "sends a signed-out visitor from any community page to sign-in" (after the `["/sponsors", "/sponsors"],` row):

```ts
      ["/boards/showcase", "/boards/showcase"],
      ["/boards/showcase/new", "/boards/showcase/new"],
```

In `src/lib/site/seo.test.ts`, change the loop in the last test to include `/boards`:

```ts
    for (const path of ["/members", "/messages", "/boards", "/api/", "/admin"]) expect(rules.disallow).toContain(path);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/supabase/proxy.test.ts src/lib/site/seo.test.ts`
Expected: FAIL (the `/boards` requests are not redirected; `disallow` lacks `/boards`).

- [ ] **Step 3: Make the three edits**

`src/lib/supabase/proxy.ts`: replace

```ts
const MEMBERS_ONLY = /^\/(?:members|member|events|connections|messages|profile|settings|admin|speakers|sponsors)(?:\/|$)/;
```

with

```ts
const MEMBERS_ONLY = /^\/(?:members|member|events|boards|connections|messages|profile|settings|admin|speakers|sponsors)(?:\/|$)/;
```

`src/app/robots.ts`: replace `"/members", "/member", "/connections",` with `"/members", "/member", "/boards", "/connections",`.

`src/components/app-chrome.tsx`: replace

```ts
  return /^\/(?:events|members|member|connections|messages|profile|settings|admin|speakers|sponsors)(?:\/|$)/.test(pathname);
```

with

```ts
  return /^\/(?:events|members|member|boards|connections|messages|profile|settings|admin|speakers|sponsors)(?:\/|$)/.test(pathname);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/supabase/proxy.test.ts src/lib/site/seo.test.ts src/proxy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/proxy.ts src/lib/supabase/proxy.test.ts src/app/robots.ts src/lib/site/seo.test.ts src/components/app-chrome.tsx
git commit -m "Make /boards members-only, uncrawlable and part of the community shell

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Left menu from the boards table, and copy

**Files:**
- Create: `src/components/navigation.ts`, `src/components/navigation.test.ts`
- Modify: `src/components/app-chrome.tsx`
- Modify: `src/lib/copy.ts` (new `boards` block)

**Interfaces:**
- Consumes: `BoardSummary` shape `{ slug, title }` (only these two fields are used).
- Produces: `type NavItem = { href: string; label: string; marker: string }`; `type BoardLink = { slug: string; title: string }`; `buildNavigation(boards: BoardLink[]): NavItem[]`; `copy.boards` (see Step 3).

- [ ] **Step 1: Write the failing test**

`src/components/navigation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildNavigation } from "./navigation";

describe("buildNavigation", () => {
  it("is the existing menu, in order, when there are no boards", () => {
    expect(buildNavigation([]).map(({ href, marker }) => [href, marker])).toEqual([
      ["/members", "01"], ["/events", "02"], ["/connections", "03"], ["/messages", "04"],
      ["/profile", "05"], ["/settings", "06"], ["/admin/events", "07"],
    ]);
  });
  it("puts one entry per board after Week 2027 and renumbers the rest", () => {
    const items = buildNavigation([{ slug: "showcase", title: "Startup Showcase" }, { slug: "jobs", title: "Jobs" }]);
    expect(items.map(({ href, label, marker }) => [href, label, marker])).toEqual([
      ["/members", "Members", "01"], ["/events", "Week 2027", "02"],
      ["/boards/showcase", "Startup Showcase", "03"], ["/boards/jobs", "Jobs", "04"],
      ["/connections", "Connections", "05"], ["/messages", "Messages", "06"],
      ["/profile", "My profile", "07"], ["/settings", "Settings", "08"], ["/admin/events", "Admin", "09"],
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/navigation.test.ts`
Expected: FAIL (`Failed to resolve import "./navigation"`).

- [ ] **Step 3: Implement the builder, wire it in, add the copy**

`src/components/navigation.ts`:

```ts
export type NavItem = { href: string; label: string; marker: string };
export type BoardLink = { slug: string; title: string };

// The community menu in order: Members, Week 2027, one entry per active board, then the rest. Markers are the 01, 02... numbers.
export function buildNavigation(boards: BoardLink[]): NavItem[] {
  const entries: Array<Omit<NavItem, "marker">> = [
    { href: "/members", label: "Members" },
    { href: "/events", label: "Week 2027" },
    ...boards.map(({ slug, title }) => ({ href: `/boards/${slug}`, label: title })),
    { href: "/connections", label: "Connections" },
    { href: "/messages", label: "Messages" },
    { href: "/profile", label: "My profile" },
    { href: "/settings", label: "Settings" },
    { href: "/admin/events", label: "Admin" },
  ];
  return entries.map((entry, index) => ({ ...entry, marker: String(index + 1).padStart(2, "0") }));
}
```

In `src/components/app-chrome.tsx`:

1. After `import { createClient } from "@/lib/supabase/browser";` add:

```ts
import { buildNavigation, type BoardLink } from "./navigation";
```

2. Delete the whole `const navigation = [ ... ];` array (the seven `{ href, label, marker }` rows).

3. After `const [unread, setUnread] = useState(0); // ...` add:

```ts
  const [boards, setBoards] = useState<BoardLink[]>([]); // active boards, one left-menu entry each
  const navigation = buildNavigation(boards);
```

4. Replace

```ts
        const [admin, waiting, unreadCount] = await Promise.all([
          supabase.rpc("is_admin"),
          supabase.rpc("pending_request_count"),
          supabase.rpc("unread_message_count"),
        ]);
        if (!current) return;
        setIsAdmin(!admin.error && admin.data === true);
```

with

```ts
        const [admin, waiting, unreadCount, boardList] = await Promise.all([
          supabase.rpc("is_admin"),
          supabase.rpc("pending_request_count"),
          supabase.rpc("unread_message_count"),
          supabase.rpc("list_boards"),
        ]);
        if (!current) return;
        setBoards(boardList.error ? [] : ((boardList.data ?? []) as BoardLink[]));
        setIsAdmin(!admin.error && admin.data === true);
```

In `src/lib/copy.ts`, insert this block immediately before the line `  posts: {` (the one followed by `title: "Post to my connections",`):

```ts
  boards: {
    newPost: "New post",
    empty: "No posts yet. Be the first to share.",
    olderPosts: "Older posts",
    newestPosts: "Newest posts",
    loading: "Loading…",
    back: "Back to the board",
    cancel: "Cancel",
    delete: "Delete",
    deleteConfirm: "Delete this post?",
    deleteYes: "Yes, delete",
    commentsCount: "{n} comments",
    commentsCountOne: "1 comment",
    form: {
      title: "Title",
      titlePlaceholder: "What are you sharing?",
      body: "Text",
      bodyPlaceholder: "Tell members about your startup, a launch or what you need.",
      images: "Images",
      imagesHint: "Up to 4 pictures (JPEG, PNG or WebP). Each is made smaller before it is uploaded.",
      addImages: "Add images",
      removeImage: "Remove image",
      publish: "Post",
      publishing: "Posting…",
    },
    errors: {
      title: "Enter a title of 1 to 120 characters.",
      body: "Write text of 1 to 5,000 characters.",
      tooManyImages: "You can add up to 4 images.",
      upload: "We could not upload an image. Try again.",
      limit: "You have reached the daily post limit for this board. Try again tomorrow.",
      notFound: "This board is not available.",
      save: "We could not save your post. Try again.",
      delete: "We could not delete this post. Try again.",
    },
    comments: {
      title: "Comments",
      none: "No comments yet.",
      placeholder: "Write a comment",
      send: "Comment",
      sending: "Sending…",
      delete: "Delete",
      errors: {
        invalid: "Write a comment of 1 to 1,000 characters.",
        limit: "You have reached the limit of 30 comments an hour. Try again later.",
        save: "We could not save your comment. Try again.",
        delete: "We could not delete this comment. Try again.",
      },
    },
  },
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: PASS, no type errors, no lint errors. (`copy.test.ts` must still pass.)

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation.ts src/components/navigation.test.ts src/components/app-chrome.tsx src/lib/copy.ts
git commit -m "Build the community menu from list_boards; add board copy

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Board page (post list)

**Files:**
- Create: `src/lib/boards/queries.ts`
- Create: `src/app/boards/[slug]/page.tsx`, `src/app/boards/[slug]/post-card.tsx`
- Modify: `src/app/globals.css` (append)

**Interfaces:**
- Consumes: `BoardSummary`, `BoardPostRow` (Task 3); `copy.boards` (Task 5); `list_boards`, `board_posts_page`, `board_post` (Task 1).
- Produces: `requireViewer(next: string): Promise<string>`; `getBoards(): Promise<BoardSummary[]>`; `getBoardPosts(slug: string, before: string | null): Promise<BoardPostRow[]>`; `getBoardPost(id: string): Promise<BoardPostRow | null>`; `BOARD_PAGE_SIZE = 20`; `<PostCard post={BoardPostRow} slug={string} />`.

- [ ] **Step 1: Read the framework guide**

Run: `ls node_modules/next/dist/docs/ | head -40` and read the pages on dynamic routes and `PageProps`. Confirm `params`/`searchParams` are promises and that the `members` page pattern (`connection()` inside `<Suspense>`) is the one in use.

- [ ] **Step 2: Write the readers**

`src/lib/boards/queries.ts`:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BoardPostRow, BoardSummary } from "./types";

export const BOARD_PAGE_SIZE = 20;

// The signed-in member's id, or a redirect to sign-in that comes back to `next`.
export async function requireViewer(next: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) redirect(`/login?next=${encodeURIComponent(next)}`);
  return sub;
}

export async function getBoards(): Promise<BoardSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_boards");
  if (error) throw new Error("boards unavailable");
  return (data ?? []) as BoardSummary[];
}

export async function getBoardPosts(slug: string, before: string | null): Promise<BoardPostRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("board_posts_page", { p_slug: slug, p_before: before, p_limit: BOARD_PAGE_SIZE });
  if (error) throw new Error("posts unavailable");
  return (data ?? []) as BoardPostRow[];
}

export async function getBoardPost(id: string): Promise<BoardPostRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("board_post", { p_id: id });
  if (error) throw new Error("post unavailable");
  const rows = (data ?? []) as BoardPostRow[];
  return rows[0] ?? null;
}
```

- [ ] **Step 3: Write the card and the page**

`src/app/boards/[slug]/post-card.tsx`:

```tsx
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { formatPostDate, previewText } from "@/lib/boards/format";
import { boardImagePublicUrl } from "@/lib/boards/images";
import type { BoardPostRow } from "@/lib/boards/types";

export function PostCard({ post, slug }: { post: BoardPostRow; slug: string }) {
  const detail = [post.author_job_title, post.author_company].filter(Boolean).join(" · ");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const cover = post.images[0] ? boardImagePublicUrl(base, post.images[0]) : null;
  return (
    <li className="board-card">
      <Link href={`/members/${post.author_id}`} className="board-card-author">
        <Avatar name={post.author_name} url={post.author_avatar} size={40} />
        <span className="board-card-author-copy">
          <span className="board-card-author-name">{post.author_name}</span>
          {detail && <span className="board-card-author-detail">{detail}</span>}
        </span>
        <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
      </Link>
      <Link href={`/boards/${slug}/${post.id}`} className="board-card-body">
        <h2 className="board-card-title">{post.title}</h2>
        <p className="board-card-preview">{previewText(post.body, 280)}</p>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- our own public bucket; no image optimizer configured
          <img className="board-card-image" src={cover} alt="" loading="lazy" />
        )}
      </Link>
    </li>
  );
}
```

`src/app/boards/[slug]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { BOARD_PAGE_SIZE, getBoardPosts, getBoards, requireViewer } from "@/lib/boards/queries";
import { PostCard } from "./post-card";

export default function BoardPage({ params, searchParams }: PageProps<"/boards/[slug]">) {
  return (
    <main className="boards-page">
      <Suspense fallback={<p className="settings-intro">{copy.boards.loading}</p>}>
        <BoardContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// ?before=<time of the last post shown>: the next older page. Anything that is not a date means the newest page.
function parseBefore(value: string | string[] | undefined): string | null {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || Number.isNaN(Date.parse(text))) return null;
  return new Date(text).toISOString();
}

async function BoardContent({ params, searchParams }: { params: PageProps<"/boards/[slug]">["params"]; searchParams: PageProps<"/boards/[slug]">["searchParams"] }) {
  await connection();
  const { slug } = await params;
  await requireViewer(`/boards/${slug}`);
  const before = parseBefore((await searchParams).before);

  const [boards, posts] = await Promise.all([getBoards(), getBoardPosts(slug, before)]);
  const board = boards.find((candidate) => candidate.slug === slug);
  if (!board) notFound();

  const last = posts[posts.length - 1];
  return (
    <>
      <header className="board-head">
        <div>
          <h1>{board.title}</h1>
          {board.description && <p>{board.description}</p>}
        </div>
        <Link className="community-action" href={`/boards/${slug}/new`}>{copy.boards.newPost}</Link>
      </header>
      {posts.length === 0 ? (
        <p className="settings-intro">{copy.boards.empty}</p>
      ) : (
        <ul className="board-list">
          {posts.map((post) => <PostCard key={post.id} post={post} slug={slug} />)}
        </ul>
      )}
      <nav className="board-pager" aria-label="Pages">
        {before && <Link className="action-quiet" href={`/boards/${slug}`}>{copy.boards.newestPosts}</Link>}
        {posts.length === BOARD_PAGE_SIZE && last && (
          <Link className="community-action community-action-secondary" href={`/boards/${slug}?before=${encodeURIComponent(last.created_at)}`}>{copy.boards.olderPosts}</Link>
        )}
      </nav>
    </>
  );
}
```

- [ ] **Step 4: Append the styles**

Append to `src/app/globals.css`:

```css
/* ===== Boards ===== */
.boards-page, .board-post-page, .board-new-page { display: flex; max-width: 920px !important; flex-direction: column; gap: 28px; }
.board-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.board-head h1 { margin: 0; }
.board-head p { max-width: 620px; margin: 10px 0 0; color: #6f7065; font-size: 14px; line-height: 1.6; }
.board-list { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
.board-card { display: flex; flex-direction: column; border: 1px solid #c8c8ba; background: #fffef8; }
.board-card-author { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 16px 18px 0; color: var(--community-charcoal); text-decoration: none; }
.board-card-author-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.board-card-author-name { font-size: 14px; font-weight: 600; }
.board-card-author-detail { overflow: hidden; color: #6f7065; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.board-card-author time { color: #8a8b7f; font-size: 12px; }
.board-card-body { display: flex; flex-direction: column; gap: 10px; padding: 14px 18px 18px; color: var(--community-charcoal); text-decoration: none; }
.board-card-title { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.board-card-preview { margin: 0; color: #55564c; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
.board-card-image { width: 100%; max-height: 320px; object-fit: cover; border: 1px solid #d7d6c9; }
.board-card-body:hover .board-card-title { text-decoration: underline; }
.board-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
@media (max-width: 760px) {
  .board-head { flex-direction: column; align-items: stretch; }
  .board-head .community-action { width: 100%; min-height: 48px; }
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: no type errors (run `npx next typegen` first if `PageProps<"/boards/[slug]">` is unknown), no lint errors, tests pass.

Then restart the dev server (stop it, `rm -rf .next/dev .next/cache`, `npm run dev`), sign in, and open `http://localhost:3000/boards/showcase`. Expected: the left menu shows **Startup Showcase** after Week 2027, the page shows the title, the Korean description, a **New post** button and "No posts yet." A signed-out private window opening `/boards/showcase` lands on `/login?next=%2Fboards%2Fshowcase`. An unknown slug (`/boards/nope`) shows the 404 page.

- [ ] **Step 6: Commit**

```bash
git add src/lib/boards/queries.ts src/app/boards src/app/globals.css
git commit -m "Add the board page and post cards

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: New post (form, image upload, server action)

**Files:**
- Create: `src/app/boards/actions.ts` (the `createBoardPost` half)
- Create: `src/app/boards/[slug]/new/page.tsx`, `src/app/boards/[slug]/new/new-post-form.tsx`
- Modify: `src/app/globals.css` (append)

**Interfaces:**
- Consumes: `cleanTitle`, `cleanBody`, `MAX_IMAGES` (Task 3); `isOwnBoardImagePath`, `boardImagePath`, `BOARD_IMAGE_BUCKET` (Task 3); `makeBoardImageBlob` (Task 3); `create_board_post` (Task 1); `copy.boards`, `copy.photo.errors` (existing: `type`, `size`, `tooBig`, `decode`).
- Produces: `createBoardPost(formData: FormData): Promise<{ error?: string; postId?: string }>`. Form fields: `slug`, `postId` (uuid), `title`, `body`, repeated `image` (storage paths).

- [ ] **Step 1: Write the server action**

`src/app/boards/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { cleanBody, cleanTitle, MAX_IMAGES } from "@/lib/boards/form";
import { isOwnBoardImagePath } from "@/lib/boards/images";
import { createClient } from "@/lib/supabase/server";

export type CreatePostResult = { error?: string; postId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The browser has already uploaded the images to <own id>/<post id>/<n>.jpg. The database checks the session, the board, the
// lengths, the image paths and the daily limit again, so nothing here is trusted on its own.
export async function createBoardPost(formData: FormData): Promise<CreatePostResult> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const title = cleanTitle(String(formData.get("title") ?? ""));
  const body = cleanBody(String(formData.get("body") ?? ""));
  const images = formData.getAll("image").map(String);
  if (!SLUG.test(slug) || !UUID.test(postId)) return { error: copy.boards.errors.save };
  if (!title) return { error: copy.boards.errors.title };
  if (!body) return { error: copy.boards.errors.body };
  if (images.length > MAX_IMAGES) return { error: copy.boards.errors.tooManyImages };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect(`/login?next=${encodeURIComponent(`/boards/${slug}/new`)}`);
  if (!images.every((path) => isOwnBoardImagePath(path, userId, postId))) return { error: copy.boards.errors.save };

  const { error } = await supabase.rpc("create_board_post", { p_id: postId, p_slug: slug, p_title: title, p_body: body, p_images: images });
  if (error) {
    if (error.code === "P0001") return { error: copy.boards.errors.limit };
    if (error.code === "P0002") return { error: copy.boards.errors.notFound };
    if (error.code === "22023" || error.code === "22001") return { error: copy.boards.errors.save };
    return { error: copy.boards.errors.save };
  }
  revalidatePath(`/boards/${slug}`);
  return { postId };
}
```

- [ ] **Step 2: Write the page and the client form**

`src/app/boards/[slug]/new/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { getBoards, requireViewer } from "@/lib/boards/queries";
import { NewPostForm } from "./new-post-form";

export default function NewBoardPostPage({ params }: PageProps<"/boards/[slug]/new">) {
  return (
    <main className="board-new-page">
      <Suspense fallback={<p className="settings-intro">{copy.boards.loading}</p>}>
        <NewPostContent params={params} />
      </Suspense>
    </main>
  );
}

async function NewPostContent({ params }: { params: PageProps<"/boards/[slug]/new">["params"] }) {
  await connection();
  const { slug } = await params;
  const userId = await requireViewer(`/boards/${slug}/new`);
  const board = (await getBoards()).find((candidate) => candidate.slug === slug);
  if (!board) notFound();
  return (
    <>
      <header className="board-head">
        <div>
          <h1>{copy.boards.newPost}</h1>
          <p>{board.title}</p>
        </div>
      </header>
      <NewPostForm slug={slug} userId={userId} />
    </>
  );
}
```

`src/app/boards/[slug]/new/new-post-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { cleanBody, cleanTitle, MAX_IMAGES } from "@/lib/boards/form";
import { BOARD_IMAGE_BUCKET, boardImagePath } from "@/lib/boards/images";
import { makeBoardImageBlob } from "@/lib/boards/resize";
import { checkSourceFile } from "@/lib/profile/photo";
import { PhotoError } from "@/lib/profile/resize";
import { createClient } from "@/lib/supabase/browser";
import { createBoardPost } from "../../actions";

type Picked = { id: string; blob: Blob; url: string };
type Notice = { message: string; tone: "error" | "success" };

export function NewPostForm({ slug, userId }: { slug: string; userId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; body?: string }>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, startSaving] = useTransition();

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setReading(true);
    const added: Picked[] = [];
    let message: string | null = null;
    for (const file of Array.from(files)) {
      if (picked.length + added.length >= MAX_IMAGES) {
        message = copy.boards.errors.tooManyImages;
        break;
      }
      const check = checkSourceFile(file);
      if (check !== "ok") {
        message = copy.photo.errors[check];
        continue;
      }
      try {
        const blob = await makeBoardImageBlob(file);
        added.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      } catch (e) {
        message = e instanceof PhotoError && e.kind === "tooBig" ? copy.photo.errors.tooBig : copy.photo.errors.decode;
      }
    }
    setPicked((current) => [...current, ...added]);
    if (message) setNotice({ message, tone: "error" });
    setReading(false);
    if (input.current) input.current.value = "";
  }

  function removePicked(id: string) {
    setPicked((current) => {
      const gone = current.find((image) => image.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return current.filter((image) => image.id !== id);
    });
  }

  async function removeUploaded(paths: string[]) {
    if (paths.length === 0) return;
    try {
      await createClient().storage.from(BOARD_IMAGE_BUCKET).remove(paths);
    } catch {
      console.error("board image cleanup failed");
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = cleanTitle(String(form.get("title") ?? ""));
    const body = cleanBody(String(form.get("body") ?? ""));
    setFieldErrors({ title: title ? undefined : copy.boards.errors.title, body: body ? undefined : copy.boards.errors.body });
    if (!title || !body) return;

    startSaving(async () => {
      const supabase = createClient();
      const postId = crypto.randomUUID();
      const paths: string[] = [];
      for (const [index, image] of picked.entries()) {
        const path = boardImagePath(userId, postId, index + 1);
        const { error } = await supabase.storage.from(BOARD_IMAGE_BUCKET).upload(path, image.blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (error) {
          await removeUploaded(paths);
          setNotice({ message: copy.boards.errors.upload, tone: "error" });
          return;
        }
        paths.push(path);
      }
      const data = new FormData();
      data.set("slug", slug);
      data.set("postId", postId);
      data.set("title", title);
      data.set("body", body);
      for (const path of paths) data.append("image", path);
      const result = await createBoardPost(data);
      if (result.error || !result.postId) {
        await removeUploaded(paths);
        setNotice({ message: result.error ?? copy.boards.errors.save, tone: "error" });
        return;
      }
      router.push(`/boards/${slug}/${result.postId}`);
    });
  }

  const busy = saving || reading;
  return (
    <form className="board-form" onSubmit={onSubmit} noValidate>
      <label className="profile-field">
        <span className="profile-field-label">{copy.boards.form.title}</span>
        <input name="title" maxLength={120} placeholder={copy.boards.form.titlePlaceholder} autoComplete="off" />
        {fieldErrors.title && <span className="profile-field-error" role="alert">{fieldErrors.title}</span>}
      </label>
      <label className="profile-field">
        <span className="profile-field-label">{copy.boards.form.body}</span>
        <textarea name="body" rows={10} maxLength={5000} placeholder={copy.boards.form.bodyPlaceholder} />
        {fieldErrors.body && <span className="profile-field-error" role="alert">{fieldErrors.body}</span>}
      </label>
      <div className="profile-field">
        <span className="profile-field-label">{copy.boards.form.images}</span>
        <span className="profile-field-hint">{copy.boards.form.imagesHint}</span>
        {picked.length > 0 && (
          <ul className="board-form-images">
            {picked.map((image) => (
              <li key={image.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the picture about to be uploaded */}
                <img src={image.url} alt="" />
                <button type="button" className="board-form-remove" aria-label={copy.boards.form.removeImage} onClick={() => removePicked(image.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
        {picked.length < MAX_IMAGES && (
          <label className="community-action community-action-secondary board-form-pick" aria-disabled={busy || undefined}>
            {copy.boards.form.addImages}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={(event) => void onPick(event.target.files)} />
          </label>
        )}
      </div>
      <div className="board-form-footer">
        <Link className="action-quiet" href={`/boards/${slug}`}>{copy.boards.cancel}</Link>
        <button type="submit" className="community-action" disabled={busy}>{saving ? copy.boards.form.publishing : copy.boards.form.publish}</button>
      </div>
      <Toast trigger={notice} message={notice?.message} tone={notice?.tone} />
    </form>
  );
}
```

- [ ] **Step 3: Append the styles**

```css
.board-form { display: flex; flex-direction: column; gap: 22px; padding: 24px; border: 1px solid #c8c8ba; background: #fffef8; }
.board-form-images { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.board-form-images li { position: relative; aspect-ratio: 1; border: 1px solid #d7d6c9; }
.board-form-images img { width: 100%; height: 100%; object-fit: cover; }
.board-form-remove { position: absolute; top: 4px; right: 4px; display: grid; width: 26px; height: 26px; place-items: center; border: 0; background: var(--community-charcoal); color: var(--community-yellow); font-size: 16px; line-height: 1; cursor: pointer; }
.board-form-pick { align-self: flex-start; }
.board-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 18px; border-top: 1px solid #d7d6c9; }
@media (max-width: 520px) {
  .board-form { padding: 16px; }
  .board-form-images { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: no type errors, no lint errors, tests pass.

Restart dev (stop, `rm -rf .next/dev .next/cache`, `npm run dev`). In the browser at `/boards/showcase/new`:
1. Submit empty: both field errors show beside their fields.
2. Add 2 photos (one large camera photo): previews appear; add 3 more, the fifth is refused with the "up to 4" toast.
3. Fill title and text, press **Post**: you land on `/boards/showcase/<id>` (404 until Task 8 exists; that is expected) and the board list now shows the post with its first image.
4. In Supabase Studio (`http://127.0.0.1:55323`) Storage > `board-images`, the files are under `<your id>/<post id>/1.jpg`, each under 500 KB.

- [ ] **Step 5: Commit**

```bash
git add src/app/boards src/app/globals.css
git commit -m "Add new board post: form, browser image resize and upload, action

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Post detail and delete

**Files:**
- Create: `src/app/boards/[slug]/[postId]/page.tsx`, `src/app/boards/[slug]/[postId]/delete-post-button.tsx`
- Modify: `src/app/boards/actions.ts` (add `deleteBoardPost`)
- Modify: `src/app/globals.css` (append)

**Interfaces:**
- Consumes: `getBoardPost`, `requireViewer` (Task 6); `delete_board_post` (Task 1); `isBoardImagePath`, `BOARD_IMAGE_BUCKET`, `boardImagePublicUrl` (Task 3); `createAdminClient` (`src/lib/supabase/admin.ts`).
- Produces: `deleteBoardPost(formData: FormData): Promise<{ error?: string }>` (fields `slug`, `postId`; redirects to the board on success); `<DeletePostButton slug postId />`.

- [ ] **Step 1: Add the delete action**

In `src/app/boards/actions.ts` add these imports at the top (merge with the existing ones):

```ts
import { BOARD_IMAGE_BUCKET, isBoardImagePath, isOwnBoardImagePath } from "@/lib/boards/images";
import { createAdminClient } from "@/lib/supabase/admin";
```

(replace the existing `import { isOwnBoardImagePath } from "@/lib/boards/images";` line) and append:

```ts
export type DeletePostResult = { error?: string };

// The database lets only the author or an admin delete, and returns the image paths. The files are then removed with the
// server-only client (an admin's own session may not delete another member's files). Failing to remove a file is logged, not fatal.
export async function deleteBoardPost(formData: FormData): Promise<DeletePostResult> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  if (!SLUG.test(slug) || !UUID.test(postId)) return { error: copy.boards.errors.delete };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect(`/login?next=${encodeURIComponent(`/boards/${slug}/${postId}`)}`);

  const { data, error } = await supabase.rpc("delete_board_post", { p_id: postId });
  if (error) return { error: copy.boards.errors.delete };

  const paths = ((data ?? []) as string[]).filter(isBoardImagePath);
  if (paths.length > 0) {
    try {
      const { error: removeError } = await createAdminClient().storage.from(BOARD_IMAGE_BUCKET).remove(paths);
      if (removeError) console.error("board image cleanup failed");
    } catch {
      console.error("board image cleanup failed");
    }
  }
  revalidatePath(`/boards/${slug}`);
  redirect(`/boards/${slug}`);
}
```

- [ ] **Step 2: Write the delete button and the page**

`src/app/boards/[slug]/[postId]/delete-post-button.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { deleteBoardPost, type DeletePostResult } from "../../actions";

export function DeletePostButton({ slug, postId }: { slug: string; postId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<DeletePostResult>({});
  const [pending, start] = useTransition();

  function onDelete() {
    const data = new FormData();
    data.set("slug", slug);
    data.set("postId", postId);
    start(async () => setResult((await deleteBoardPost(data)) ?? {}));
  }

  if (!confirming) {
    return <button type="button" className="action-quiet" onClick={() => setConfirming(true)}>{copy.boards.delete}</button>;
  }
  return (
    <span className="board-delete-confirm">
      <span>{copy.boards.deleteConfirm}</span>
      <button type="button" className="community-action" disabled={pending} onClick={onDelete}>{copy.boards.deleteYes}</button>
      <button type="button" className="action-quiet" disabled={pending} onClick={() => setConfirming(false)}>{copy.boards.cancel}</button>
      <Toast trigger={result} message={result.error} tone="error" />
    </span>
  );
}
```

`src/app/boards/[slug]/[postId]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { formatPostDate } from "@/lib/boards/format";
import { boardImagePublicUrl } from "@/lib/boards/images";
import { getBoardPost, requireViewer } from "@/lib/boards/queries";
import { DeletePostButton } from "./delete-post-button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default function BoardPostPage({ params }: PageProps<"/boards/[slug]/[postId]">) {
  return (
    <main className="board-post-page">
      <Suspense fallback={<p className="settings-intro">{copy.boards.loading}</p>}>
        <PostContent params={params} />
      </Suspense>
    </main>
  );
}

async function PostContent({ params }: { params: PageProps<"/boards/[slug]/[postId]">["params"] }) {
  await connection();
  const { slug, postId } = await params;
  if (!UUID.test(postId)) notFound();
  await requireViewer(`/boards/${slug}/${postId}`);
  const post = await getBoardPost(postId);
  if (!post) notFound();

  const detail = [post.author_job_title, post.author_company].filter(Boolean).join(" · ");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const images = post.images.map((path) => boardImagePublicUrl(base, path)).filter((url): url is string => url !== null);
  return (
    <>
      <Link className="action-quiet board-back" href={`/boards/${slug}`}>← {copy.boards.back}</Link>
      <article className="board-article">
        <header className="board-article-head">
          <Link href={`/members/${post.author_id}`} className="board-card-author">
            <Avatar name={post.author_name} url={post.author_avatar} size={44} />
            <span className="board-card-author-copy">
              <span className="board-card-author-name">{post.author_name}</span>
              {detail && <span className="board-card-author-detail">{detail}</span>}
            </span>
            <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
          </Link>
          <h1>{post.title}</h1>
        </header>
        <p className="board-article-body">{post.body}</p>
        {images.length > 0 && (
          <div className="board-article-images">
            {images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- our own public bucket; no image optimizer configured
              <img key={url} src={url} alt="" loading="lazy" />
            ))}
          </div>
        )}
        {post.can_delete && (
          <footer className="board-article-foot">
            <DeletePostButton slug={slug} postId={post.id} />
          </footer>
        )}
      </article>
    </>
  );
}
```

- [ ] **Step 3: Append the styles**

```css
.board-back { align-self: flex-start; text-decoration: none; }
.board-article { display: flex; flex-direction: column; gap: 22px; padding: 24px; border: 1px solid #c8c8ba; background: #fffef8; }
.board-article-head { display: flex; flex-direction: column; gap: 18px; }
.board-article-head .board-card-author { padding: 0; }
.board-article-head h1 { margin: 0; font-size: 24px; line-height: 1.3; overflow-wrap: anywhere; }
.board-article-body { margin: 0; color: #3a3b33; font-size: 15px; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
.board-article-images { display: flex; flex-direction: column; gap: 12px; }
.board-article-images img { width: 100%; height: auto; border: 1px solid #d7d6c9; }
.board-article-foot { display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #d7d6c9; }
.board-delete-confirm { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 13px; }
@media (max-width: 520px) { .board-article { padding: 16px; } }
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: no type errors, no lint errors, tests pass.

Restart dev (stop, `rm -rf .next/dev .next/cache`, `npm run dev`). In the browser:
1. Open the post from Task 7: title, text with line breaks, all images, and a **Delete** action (yours).
2. **Delete** shows "Delete this post?" with **Yes, delete** and **Cancel**; Cancel hides it; Yes returns to the board, the post is gone, and its files are gone from Storage `board-images`.
3. With a second member, open the first member's post: no **Delete**. With an admin, **Delete** is shown on anyone's post.
4. `/boards/showcase/not-a-uuid` shows the 404 page.

- [ ] **Step 5: Commit**

```bash
git add src/app/boards src/app/globals.css
git commit -m "Add board post detail and delete

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Phase 2

### Task 9: Comments (UI and actions) and the count on cards

**Files:**
- Create: `src/app/boards/comment-actions.ts`
- Create: `src/app/boards/[slug]/[postId]/comments.tsx`, `comment-form.tsx`, `delete-comment-button.tsx`
- Modify: `src/lib/boards/queries.ts` (add `getBoardComments`)
- Modify: `src/app/boards/[slug]/[postId]/page.tsx` (render comments), `src/app/boards/[slug]/post-card.tsx` (count)
- Modify: `src/app/globals.css` (append)

**Interfaces:**
- Consumes: `BoardCommentRow` (Task 3); `cleanComment` (Task 3); `board_comments_page`, `create_board_comment`, `delete_board_comment` (Task 2); `copy.boards.comments`, `copy.boards.commentsCount*` (Task 5).
- Produces: `createBoardComment(prev: CommentState, formData: FormData): Promise<CommentState>` where `CommentState = { error?: string; sentAt?: number }` (fields `slug`, `postId`, `body`); `deleteBoardComment(formData: FormData): Promise<{ error?: string }>` (fields `slug`, `postId`, `commentId`); `getBoardComments(postId: string): Promise<BoardCommentRow[]>`.

- [ ] **Step 1: Write the comment actions and the reader**

`src/app/boards/comment-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { cleanComment } from "@/lib/boards/form";
import { createClient } from "@/lib/supabase/server";

export type CommentState = { error?: string; sentAt?: number };
export type DeleteCommentResult = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function memberSession(next: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect(`/login?next=${encodeURIComponent(next)}`);
  return supabase;
}

// The database checks the session, the post, the length and the 30-an-hour limit again.
export async function createBoardComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const body = cleanComment(String(formData.get("body") ?? ""));
  if (!SLUG.test(slug) || !UUID.test(postId)) return { error: copy.boards.comments.errors.save };
  if (!body) return { error: copy.boards.comments.errors.invalid };

  const supabase = await memberSession(`/boards/${slug}/${postId}`);
  const { error } = await supabase.rpc("create_board_comment", { p_post: postId, p_body: body });
  if (error) {
    if (error.code === "P0001") return { error: copy.boards.comments.errors.limit };
    if (error.code === "22023" || error.code === "22001") return { error: copy.boards.comments.errors.invalid };
    return { error: copy.boards.comments.errors.save };
  }
  revalidatePath(`/boards/${slug}/${postId}`);
  revalidatePath(`/boards/${slug}`);
  return { sentAt: Date.now() };
}

export async function deleteBoardComment(formData: FormData): Promise<DeleteCommentResult> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  if (!SLUG.test(slug) || !UUID.test(postId) || !UUID.test(commentId)) return { error: copy.boards.comments.errors.delete };

  const supabase = await memberSession(`/boards/${slug}/${postId}`);
  const { error } = await supabase.rpc("delete_board_comment", { p_id: commentId });
  if (error) return { error: copy.boards.comments.errors.delete };
  revalidatePath(`/boards/${slug}/${postId}`);
  revalidatePath(`/boards/${slug}`);
  return {};
}
```

In `src/lib/boards/queries.ts` change the types import to `import type { BoardCommentRow, BoardPostRow, BoardSummary } from "./types";` and append:

```ts
export async function getBoardComments(postId: string): Promise<BoardCommentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("board_comments_page", { p_post: postId, p_after: null, p_limit: 50 });
  if (error) throw new Error("comments unavailable");
  return (data ?? []) as BoardCommentRow[];
}
```

- [ ] **Step 2: Write the comment UI**

`src/app/boards/[slug]/[postId]/comment-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { createBoardComment, type CommentState } from "../../comment-actions";

export function CommentForm({ slug, postId }: { slug: string; postId: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(createBoardComment, {});
  return (
    // The key changes after a successful send, which clears the box.
    <form className="board-comment-form" action={action} key={state.sentAt ?? 0}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      <textarea name="body" rows={3} maxLength={1000} placeholder={copy.boards.comments.placeholder} aria-label={copy.boards.comments.placeholder} />
      <button type="submit" className="community-action" disabled={pending}>{pending ? copy.boards.comments.sending : copy.boards.comments.send}</button>
      <Toast trigger={state} message={state.error} tone="error" />
    </form>
  );
}
```

`src/app/boards/[slug]/[postId]/delete-comment-button.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { deleteBoardComment, type DeleteCommentResult } from "../../comment-actions";

export function DeleteCommentButton({ slug, postId, commentId }: { slug: string; postId: string; commentId: string }) {
  const [result, setResult] = useState<DeleteCommentResult>({});
  const [pending, start] = useTransition();
  function onDelete() {
    const data = new FormData();
    data.set("slug", slug);
    data.set("postId", postId);
    data.set("commentId", commentId);
    start(async () => setResult(await deleteBoardComment(data)));
  }
  return (
    <>
      <button type="button" className="action-quiet" disabled={pending} onClick={onDelete}>{copy.boards.comments.delete}</button>
      <Toast trigger={result} message={result.error} tone="error" />
    </>
  );
}
```

`src/app/boards/[slug]/[postId]/comments.tsx` (server component):

```tsx
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { formatPostDate } from "@/lib/boards/format";
import { getBoardComments } from "@/lib/boards/queries";
import { CommentForm } from "./comment-form";
import { DeleteCommentButton } from "./delete-comment-button";

export async function Comments({ slug, postId }: { slug: string; postId: string }) {
  const comments = await getBoardComments(postId);
  return (
    <section className="board-comments" aria-label={copy.boards.comments.title}>
      <h2>{copy.boards.comments.title}</h2>
      {comments.length === 0 ? (
        <p className="settings-intro">{copy.boards.comments.none}</p>
      ) : (
        <ul className="board-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="board-comment">
              <Link href={`/members/${comment.author_id}`} className="board-comment-avatar" aria-label={comment.author_name}>
                <Avatar name={comment.author_name} url={comment.author_avatar} size={36} />
              </Link>
              <div className="board-comment-main">
                <div className="board-comment-meta">
                  <Link href={`/members/${comment.author_id}`}>{comment.author_name}</Link>
                  <time dateTime={comment.created_at}>{formatPostDate(comment.created_at)}</time>
                  {comment.can_delete && <DeleteCommentButton slug={slug} postId={postId} commentId={comment.id} />}
                </div>
                <p>{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CommentForm slug={slug} postId={postId} />
    </section>
  );
}
```

- [ ] **Step 3: Render comments on the detail page and the count on cards**

In `src/app/boards/[slug]/[postId]/page.tsx` add `import { Comments } from "./comments";` and, after the closing `</article>`, render the comments (inside the fragment):

```tsx
      </article>
      <Comments slug={slug} postId={post.id} />
    </>
```

In `src/app/boards/[slug]/post-card.tsx` add `import { copy } from "@/lib/copy";` and, inside `<Link className="board-card-body" ...>` after the optional image, add:

```tsx
        <span className="board-card-count">{post.comment_count === 1 ? copy.boards.commentsCountOne : copy.boards.commentsCount.replace("{n}", String(post.comment_count))}</span>
```

- [ ] **Step 4: Append the styles**

```css
.board-card-count { color: #6f7065; font-size: 12px; }
.board-comments { display: flex; flex-direction: column; gap: 16px; }
.board-comments h2 { margin: 0; font-size: 15px; letter-spacing: .04em; text-transform: uppercase; }
.board-comment-list { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
.board-comment { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; }
.board-comment-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 13px; }
.board-comment-meta a { color: var(--community-charcoal); font-weight: 600; text-decoration: none; }
.board-comment-meta time { color: #8a8b7f; font-size: 12px; }
.board-comment p { margin: 4px 0 0; color: #3a3b33; font-size: 14px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.board-comment-form { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.board-comment-form textarea { width: 100%; padding: 10px 12px; font-size: 14px; line-height: 1.6; resize: vertical; }
.board-comment-form textarea:focus { border-color: var(--community-charcoal); }
@media (max-width: 760px) { .board-comment-form .community-action { width: 100%; min-height: 48px; } }
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: no type errors, no lint errors, tests pass.

Restart dev (stop, `rm -rf .next/dev .next/cache`, `npm run dev`). With two members (and an admin):
1. On a post, write a comment: it appears at the bottom, the box clears, the card on the board shows "1 comment".
2. A whitespace-only comment shows the error toast; a 1,001-character one shows it too.
3. The commenter and the admin see **Delete** on that comment; the post's author does not (unless they wrote it). Deleting returns the count to "0 comments".
4. Korean text typed with an IME is saved intact.

- [ ] **Step 6: Commit**

```bash
git add src/app/boards src/lib/boards/queries.ts src/app/globals.css
git commit -m "Add board comments: list, write, delete, count on cards

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Documentation, spec sync, and the full check

**Files:**
- Modify: `AGENTS.md`, `README.md`
- Modify: `docs/specs/2026-11-18-boards-startup-showcase.md` (record three deliberate deviations)

- [ ] **Step 1: Update the spec to match what was built**

In `docs/specs/2026-11-18-boards-startup-showcase.md`:
- In "Database", change the `create_board_post` signature line to `create_board_post(p_id, p_slug, p_title, p_body, p_images text[])` and add: "`p_id` is chosen by the browser because the image paths contain it."
- Change `board_comments_page(p_post, p_before, p_limit)` to `board_comments_page(p_post, p_after, p_limit)` and add "oldest first".
- In "Screens and routing", change "with a **Load more** action" to "with an **Older posts** link (`?before=<time>`) and a **Newest posts** link back".

- [ ] **Step 2: Add the rules to AGENTS.md and README.md**

Append to `AGENTS.md` a section "Community boards — November 18, 2026" stating: boards are rows in `boards`; `/boards/[slug]` serves every board and the left menu is built from `list_boards()`; first board `showcase` (Startup Showcase); free-form posts (title 1 to 120, text 1 to 5,000, up to 4 JPEG images in public bucket `board-images`, resized in the browser to 1,600 px, 500 KB each) and comments (1 to 1,000); any signed-in member posts immediately; delete by the author or an admin, no editing; limits 5 posts per 24 hours per board and 30 comments per hour; all tables closed and reached by `security definer` functions; `/boards` is in `isCommunityRoute`, `MEMBERS_ONLY` and the robots `disallow`; the old `posts` DM feature is separate and untouched; the migration is `20261118100000_boards.sql` and is **not applied to production** until requested; changes are local, no commit to main, push or deployment until the user asks.

Add one line to the community section of `README.md` pointing to `docs/specs/2026-11-18-boards-startup-showcase.md` and `/boards/[slug]`.

- [ ] **Step 3: Run the whole check**

Run:

```bash
supabase db reset && npm run test:db && npm test && npx tsc --noEmit && npm run lint
```

Expected: every pgTAP file passes (including `boards.test.sql` 37 and `board_comments.test.sql` 21), all Vitest tests pass, no type errors, no lint errors.

- [ ] **Step 4: Manual pass (desktop and a 390 px phone width)**

With the dev server freshly restarted:
1. Menu: **Startup Showcase** is third; at 390 px the five tabs (Members, Week 2027, Startup Showcase, Connections, Messages) fit on one row. If the label is cut off or wraps, add `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` to `.community-nav-link` inside the existing `@media (max-width: 760px)` block of `globals.css` and recheck.
2. Create a post with 4 images from a phone-size screenshot and a large camera photo; they upload and display; each stored file is under 500 KB.
3. Signed-out private window: `/boards/showcase` redirects to `/login?next=...`; `/robots.txt` lists `/boards` under Disallow.
4. Delete the test posts and comments you made.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md README.md docs/specs/2026-11-18-boards-startup-showcase.md
git commit -m "Document community boards; sync the spec with the build

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review (spec coverage)

- Boards as rows, seeded `showcase`, per-board columns (`allow_images`, `post_limit_per_day`): Task 1.
- Posts (title, text, up to 4 images), closed tables, functions, explicit grants, rate limit, storage bucket and policies: Task 1.
- Comments, 30 per hour, delete by author or admin, `comment_count`: Task 2.
- Access rules and limits tested (signed-out refusal, others' deletes, admin delete, grants, limits, image path rules, storage policy): Tasks 1 and 2.
- Form rules, image path and resize helpers, formatting: Task 3.
- The three access-wiring changes and tests: Task 4.
- Menu entry per active board, copy: Task 5.
- Board list, card, "Older posts" paging, 404 for unknown slug: Task 6.
- New post with browser image resize, upload-then-create, cleanup of uploaded files on failure: Task 7.
- Detail, delete with file cleanup through the server-only client: Task 8.
- Comment UI and count on cards (phase 2): Task 9.
- Docs, spec sync, full check, mobile check: Task 10.
- Known gap carried over from the spec: deleting an account removes its posts and comments but not its image files.
- Type and name consistency checked across tasks: `create_board_post(p_id, p_slug, p_title, p_body, p_images)`, `board_comments_page(p_post, p_after, p_limit)`, `createBoardPost(formData)`, `deleteBoardPost(formData)`, `createBoardComment(prev, formData)`, `deleteBoardComment(formData)`, `getBoards`, `getBoardPosts`, `getBoardPost`, `getBoardComments`, `requireViewer`, `buildNavigation`.
