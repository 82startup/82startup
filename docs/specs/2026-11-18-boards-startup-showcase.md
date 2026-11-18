# Community boards, starting with Startup Showcase

Date: 2026-11-18. A general board system for the members-only community. The first board is **Startup Showcase**, where members
promote their startups. Later boards (jobs, fundraising, and so on) are added as rows, not as new code.

## Scope

In: boards as data; free-form posts (title, text, up to 4 images); comments; delete by the author or an admin; a left-menu entry per
active board; rate limits; access rules and tests.
Out (this version): editing a post or comment, likes, reporting, notifications, search, pinning, per-board rules beyond the two
columns below, a public (signed-out) view, email digests.

## Decisions (owner, 2026-11-18)

- Free-form writing (title + text + images), not a fixed startup card.
- Any signed-in member may post and comment; posts are public to members immediately (no approval step).
- Images and comments are both included, built in two phases (below).
- Several boards must be possible later. Each active board gets its own left-menu entry.
- First board: `showcase`, titled **Startup Showcase**, with a Korean description.

## Not the old `posts`

`public.posts` and `/messages` post box deliver a post as a direct message to connections; that code stays hidden and untouched.
The new tables, functions, routes and copy all use the `board` prefix so the two never collide.

## Database

One timestamped migration. Every table is closed (`revoke all` from public, anon, authenticated, service_role); all access is through
`security definer` functions with `set search_path = ''`, and each function is granted explicitly to `authenticated` only
(production has no default grants).

- **`boards`**: `id uuid`, `slug text unique` (lowercase letters, digits, hyphen), `title text`, `description text`,
  `sort_order integer`, `is_active boolean`, `allow_images boolean default true`, `post_limit_per_day integer default 5`.
  Seeded with `showcase`.
- **`board_posts`**: `id uuid`, `board_id` (to `boards`), `author_id` (to `profiles`, delete cascade), `title` (1 to 120 characters
  after trimming), `body` (1 to 5,000), `images text[]` (at most 4, each a path in the `board-images` bucket), `comment_count integer`,
  `created_at`. Index on `(board_id, created_at desc, id)`.
- **`board_comments`**: `id uuid`, `post_id` (to `board_posts`, delete cascade), `author_id` (to `profiles`, delete cascade),
  `body` (1 to 1,000 after trimming), `created_at`. Index on `(post_id, created_at, id)`.
- Text is trimmed of every kind of whitespace at both ends, as in `deliver_message`. Plain text only; no markup and no link buttons.
- **Functions** (all refuse without a session with errcode `28000`):
  - `list_boards()`: active boards in `sort_order`, for the menu and the page header.
  - `board_posts_page(p_slug, p_before timestamptz, p_limit)`: newest first, at most 20 per page; returns post fields, `comment_count`,
    the author's id, name, job title, company and avatar, and whether the caller may delete it.
  - `board_post(p_id)`: one post with the same author fields.
  - `create_board_post(p_slug, p_title, p_body, p_images text[])`: checks the board is active, title/body length, that each image path is
    `<caller id>/<uuid>/<n>.jpg`, `allow_images`, the at-most-4 rule and the per-board limit (`post_limit_per_day` in any 24 hours,
    errcode `P0001`); returns the new post id.
  - `delete_board_post(p_id)`: the author or an admin (`is_admin`); the storage objects are removed by the application after the row is gone.
  - `board_comments_page(p_post, p_before, p_limit)`, `create_board_comment(p_post, p_body)` (at most 30 comments per caller in any hour,
    `P0001`; increments `comment_count` in the same transaction), `delete_board_comment(p_id)` (author or admin; decrements the count).
- **Storage**: public bucket `board-images`, JPEG only, 500 KB per file. Policies mirror `avatars`: a member may insert, select and delete
  only objects whose name matches `^<their id>/<uuid>/<1-4>\.jpg$`; no update rule, so nothing can be overwritten.
- Admins cannot read anything the members' own screens do not already show.

## Screens and routing

- `/boards/[slug]`: header (board title and description, a **New post** action), then the post list newest first with a **Load more**
  action. A post card shows the author (avatar, name, `job · company`; selecting the author opens the existing `/members/[id]` modal),
  the title, the first lines of the text, the first image, the comment count and the time. An unknown or inactive slug is a 404.
- `/boards/[slug]/new`: title, text and an image picker (up to 4; each is resized in the browser to at most 1,600 px on the long side and
  saved as JPEG, as profile photos are). Errors appear beside their fields; a save result appears as a toast. On success go to the post.
- `/boards/[slug]/[postId]`: the full post and its images; a delete action for the author or an admin; from phase 2, the comments and
  the comment box.
- **Menu**: `app-chrome.tsx` shows one entry per active board after Week 2027, labelled with the board title, active on any
  `/boards/<slug>` route. On mobile the entries join the equal-width tab row; if a second board makes the row too tight, group
  the boards into one entry then.
- Styling reuses the community classes (`.community-action`, `.community-action-secondary`, `.action-quiet`), square borders, the Summit
  palette, no focus rings and no left-edge accent lines.
- **Access wiring** (all three must change or the boards would be public or indexed): `isCommunityRoute` in `src/components/app-chrome.tsx`,
  `isMembersOnlyPath` in `src/lib/supabase/proxy.ts` (signed-out requests go to `/login?next=...`), and `src/app/robots.ts` (disallow `/boards`).
  `src/lib/site/seo.test.ts` is extended for the new route.

## Phases

1. **Phase 1**: the whole migration (including comment tables and functions), boards in the menu, list, new post with images, post
   detail, delete, the three access-wiring changes, tests and docs.
2. **Phase 2**: the comment UI on the post detail (list, write, delete) and the comment count on cards.

## Errors and edge cases

- Over the limit: the form shows a message that the daily post limit (or hourly comment limit) was reached; it does not say when posting reopens.
- A failed image upload leaves no post: images are uploaded first under a client-generated post id, then `create_board_post` is called;
  if the call fails, the uploaded files are deleted again by the application. Orphans from a crash between the two steps are tolerated.
- Deleting an account deletes its posts and comments (cascade); its image files are not removed by this version (noted as a known gap).
- Long unbroken text wraps; images are shown with fixed aspect boxes so a tall image cannot break the layout.

## Testing

Tests are written first for the access rules.

- `npm run test:db`: a signed-out caller is refused by every function; a member cannot delete another member's post or comment; an admin can;
  the table and function grants exist for `authenticated` and not for `anon` (production-like grant check); title/body length limits;
  the 5 posts per 24 hours and 30 comments per hour limits; an image path that is not the caller's own folder is refused; the storage policy
  refuses another member's folder and any non-JPEG; `comment_count` stays correct after create and delete.
- `npm test`: form parsing and trimming, image-path validation, image resizing helper, copy strings, the menu entry and route-matching rules,
  `seo.test.ts` for `/boards`.
- Manual check on localhost before anything is shipped: post with and without images, delete, signed-out redirect, mobile layout.

## Documentation and release

Add the rules to `AGENTS.md`, `README.md` and a short note in `docs/specs/`. Changes stay local; nothing is committed beyond this spec,
pushed, migrated in production or deployed until the owner asks. The production migration needs explicit grants (see the existing
memory note) and is applied only on request.
