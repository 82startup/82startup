# Community boards, starting with Startup Showcase

Date: 2026-11-18. A general board system for the members-only community. The first board is **Startup Showcase**, where members
promote their startups. Later boards (jobs, fundraising, and so on) are added as rows, not as new code.

## Scope

In: boards as data; free-form posts (title, text, up to 4 images); comments; edit by the author only (a post's title, text and pictures, a comment's text); delete by the author or an admin; a left-menu
entry per active board; rate limits; access rules and tests.
Out (this version): likes, reporting, notifications, search, pinning, per-board rules beyond the two
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

Three timestamped migrations: `20261118100000_boards.sql` (everything below), `20261118110000_board_edit.sql` (editing, see "Editing"
below) and `20261118120000_board_edit_followups.sql` (the comment-edit block rule and a row lock on post edits). None is applied to production until the owner asks. Every table is closed (`revoke all` from public, anon, authenticated, service_role); all access is through
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
  - `create_board_post(p_id, p_slug, p_title, p_body, p_images text[])`: checks the board is active, title/body length, that each image path is
    `<caller id>/<uuid>/<n or uuid>.jpg`, `allow_images`, the at-most-4 rule and the per-board limit (`post_limit_per_day` in any 24 hours,
    errcode `P0001`); returns the new post id. `p_id` is chosen by the browser because the image paths contain it. It refuses (errcode `22023`) a caller whose profile name is empty.
  - `delete_board_post(p_id)`: the author or an admin (`is_admin`); the storage objects are removed by the application after the row is gone.
  - `board_comments_page(p_post, p_after, p_limit)` (oldest first), `create_board_comment(p_post, p_body)` (at most 30 comments per caller in any hour, `P0001`;
    refuses `22023` a profile with an empty name; refuses `P0002` an unknown post, or one whose author is blocked by or blocking the caller; reading is unchanged),
    `delete_board_comment(p_id)` (author or admin). `comment_count` (never negative) is kept by an after insert/delete trigger on `board_comments`, so cascades keep it right.
- **Storage**: public bucket `board-images`, JPEG only, 500 KB per file. Policies mirror `avatars`: a member may insert, select and delete
  only objects whose name matches `^<their id>/<uuid>/<1-4 or uuid>\.jpg$` (the uuid file name was added by the second migration); no update rule, so nothing can be overwritten.
- Admins cannot read anything the members' own screens do not already show.

### Editing (second migration, `20261118110000_board_edit.sql`)

- Only the author edits; an admin cannot edit another member's post or comment (an admin can still delete). Delete stays author or admin.
  There is no "edited" marker and no rate limit on edits.
- `update_board_post(p_id, p_title, p_body, p_images text[])`: author only (`P0002` otherwise), same title/body/image checks as create and an
  active board; refuses `22023` a profile with an empty name. `p_images` is the full ordered list (kept paths plus new ones). It returns the
  picture paths that are no longer in the post; the application removes those files with the member's own session (the storage delete
  policy allows own files). A failed removal is logged, not fatal.
- `update_board_comment(p_id, p_body)`: author only, text 1 to 1,000 after trimming. From the third migration it follows the block rule: a comment author blocked by or blocking the post's author gets `P0002`, as for an unknown comment. The same migration makes `update_board_post` lock the post row (`for update`) so concurrent edits serialise.
- `board_post` and `board_comments_page` gain a final `can_edit` column (true for the author only); `can_delete` is unchanged.
- Picture file names: new pictures are stored as `<author id>/<post id>/<uuid>.jpg` with a random lower-case uuid. They are uploaded with a
  one-year cache lifetime, so a replaced picture must get a new address. Old `1.jpg` to `4.jpg` names stay valid. The `create_board_post`
  path check and the storage policies (insert, select, delete) accept either form.
- Deleting a post still removes all its files with the service-role client.

## Screens and routing

- `/boards/[slug]`: header (board title and description, a **New post** action), then the post list newest first with an **Older posts** link (`?before=<time>`) and a **Newest posts** link back. The list is one line per post: a small thumbnail (first image), the title with `author · job · company` beneath, the date and the comment count; the whole row is one link to the post. An unknown or inactive slug is a 404.
- `/boards/[slug]/new`: title, text and an image picker (up to 4; each is resized in the browser to at most 1,600 px on the long side and
  saved as JPEG, as profile photos are). Errors appear beside their fields; a save result appears as a toast. On success go to the post. The form is always empty on every visit and after saving.
- `/boards/[slug]/[postId]`: the full post and its images; an **Edit** link for the author only and a delete action for the author or an admin; from phase 2, the comments and
  the comment box. Each comment shows an edit action for its author (text only, drafts are controlled so a failed save or send keeps the typed text).
- `/boards/[slug]/[postId]/edit`: the same `PostForm` as the new-post page, filled from the stored post (title, text, pictures; each picture can be removed, new ones added, up to 4). It is keyed on the server data, so it remounts when the data changes. Only the author reaches it.
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

Deviations and decisions recorded after the build:
- Text is trimmed with an explicit whitespace class (`\s` plus U+00A0, U+2000-U+200B, U+3000, U+FEFF) in SQL and the matching class in JS (`src/lib/boards/form.ts`).
- The comment count is shown on each list row; comments on a post are read as at most the oldest 50, with no pagination in this version (known limitation).
- Posting is an explicit act of publishing, so an author is shown with name, job, company and picture even when they hid themselves from the member directory (documented decision).
- If `createBoardPost` fails ambiguously (the call throws), uploaded images are deliberately NOT deleted, since the post may exist.
- Deleting a post removes its image files with the server-only service-role client, after the database authorised the delete.

- Over the limit: the form shows a message that the daily post limit (or hourly comment limit) was reached; it does not say when posting reopens.
- A failed image upload leaves no post: images are uploaded first under a client-generated post id, then `create_board_post` is called;
  on a definite error (not when the call itself throws), the uploaded files are deleted again by the application. Orphans from a crash between the two steps are tolerated.
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
