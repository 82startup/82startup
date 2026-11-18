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
  - `create_board_post(p_id, p_slug, p_title, p_body, p_images text[])`: checks the board is active, title/body length, that each image path is
    `<caller id>/<uuid>/<n>.jpg`, `allow_images`, the at-most-4 rule and the per-board limit (`post_limit_per_day` in any 24 hours,
    errcode `P0001`); returns the new post id. `p_id` is chosen by the browser because the image paths contain it. It refuses (errcode `22023`) a caller whose profile name is empty.
  - `delete_board_post(p_id)`: the author or an admin (`is_admin`); the storage objects are removed by the application after the row is gone.
  - `board_comments_page(p_post, p_after, p_limit)` (oldest first), `create_board_comment(p_post, p_body)` (at most 30 comments per caller in any hour,
    `P0001`; refuses `22023` a profile with an empty name; refuses `P0002` an unknown post or one whose author is blocked by or blocking the caller; reading is unchanged),
    `delete_board_comment(p_id)` (author or admin). `comment_count` (never negative) is maintained by an after insert/delete trigger on `board_comments`, so cascades
    such as deleting a commenter's account keep it right.
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
