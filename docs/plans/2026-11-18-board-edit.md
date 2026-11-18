# Board post and comment editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The author of a board post can edit its title, text and pictures; the author of a comment can edit its text. Delete stays allowed for the author and for admins.

**Architecture:** One new migration adds `update_board_post` and `update_board_comment` (author only), a `can_edit` column on `board_post` and `board_comments_page`, and widens the image path rule so new pictures get a random file name (`<author id>/<post id>/<uuid>.jpg`). Random names matter because pictures are cached for a year at their address: replacing a picture at the same address would keep showing the old one. The old `1.jpg` to `4.jpg` names stay valid so existing posts keep working. The new-post form is generalized into one `PostForm` used for both creating and editing; comments get an inline edit mode.

**Tech Stack:** Next.js 16, React 19, Supabase (Postgres, Storage, pgTAP), Vitest.

**Spec:** `docs/specs/2026-11-18-boards-startup-showcase.md` (this plan changes its "no editing" rule; Task 5 updates the spec).

## Global Constraints

- Branch `boards`; commits are local only; never push, never apply anything to production, never use `supabase` with `--linked`, `db push`, `db pull` or `link`; never edit `.env.local`. Do NOT run `supabase db reset` (it would erase the owner's local test account and posts); apply the new migration with `supabase migration up --local`, then run `npm run test:db`.
- Next.js 16: read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code; `params` are async; dynamic data inside `<Suspense>` after `await connection()`.
- Closed tables and `security definer` functions with `set search_path = ''`, session check (`28000`), `revoke all ... from public, anon, authenticated, service_role` and an explicit `grant execute ... to authenticated`. Error codes: `28000` not signed in, `22023` invalid input, `22001` too long, `P0002` not found or not allowed.
- Limits unchanged: title 1 to 120, text 1 to 5,000, comment 1 to 1,000 (trimmed with the explicit whitespace class already used in the migration: `\s` plus U+00A0, U+2000-U+200B, U+3000, U+FEFF; copy the literal expression programmatically from `supabase/migrations/20261118100000_boards.sql`, never retype it), at most 4 pictures, JPEG 500 KB each in bucket `board-images`, resized in the browser to 1,600 px.
- Editing a post: the author only (not admins, not other members). Editing a comment: the author only. Deleting a post or comment: the author or an admin (unchanged). No "edited" marker. No rate limit on edits. A profile with an empty name is refused (`22023`) like on create.
- UI rules: reuse `.community-action`, `.community-action-secondary`, `.action-quiet`; no focus outlines or rings; never `border-left` or inset stripes; results and errors in `src/components/toast.tsx`, field errors beside the field; new `.board-*` CSS names must not collide with the legacy `.board-list`, `.board-section`, `.board-error`, `.board-composer*`.
- New-post form keeps its behaviour: empty on every visit (reset on leave and after saving), upload-then-call ordering, cleanup of uploaded files only on a definite error, never on an ambiguous throw, redirects rethrown.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261118110000_board_edit.sql` (create) | Widened storage policies and `create_board_post` path check, `update_board_post`, `update_board_comment`, `can_edit` on `board_post` / `board_comments_page`. |
| `supabase/tests/board_edit.test.sql` (create) | pgTAP tests for the new functions, `can_edit` and the widened rules. |
| `src/lib/boards/images.ts`, `images.test.ts` (modify) | Random file names, widened path rules, UUID guard before building a RegExp. |
| `src/lib/boards/types.ts` (modify) | `can_edit` on `BoardPostRow` and `BoardCommentRow`. |
| `src/app/boards/[slug]/new/new-post-form.tsx` -> `src/app/boards/post-form.tsx` (move + generalize) | One form for create and edit. |
| `src/app/boards/[slug]/new/page.tsx` (modify), `src/app/boards/[slug]/[postId]/edit/page.tsx` (create) | New and edit screens. |
| `src/app/boards/actions.ts` (modify) | `updateBoardPost`. |
| `src/app/boards/[slug]/[postId]/page.tsx` (modify) | Edit link for the author. |
| `src/app/boards/comment-actions.ts` (modify), `src/app/boards/[slug]/[postId]/comment-body.tsx` (create), `comments.tsx` (modify) | Comment editing. |
| `src/lib/copy.ts`, `src/app/globals.css`, `AGENTS.md`, spec (modify) | Copy, styles, documentation. |

---

### Task 1: Database: edit functions, `can_edit`, widened image names (tests first)

**Files:**
- Create: `supabase/tests/board_edit.test.sql`
- Create: `supabase/migrations/20261118110000_board_edit.sql`

**Interfaces:**
- Consumes: tables and functions from `20261118100000_boards.sql` (read it first: `board_posts`, `board_comments`, `boards`, `create_board_post`, `board_post`, `board_comments_page`, `is_admin`, the three storage policies).
- Produces (SQL, `authenticated` only):
  - `update_board_post(p_id uuid, p_title text, p_body text, p_images text[]) returns text[]` (the image paths that were removed, so the application can delete the files)
  - `update_board_comment(p_id uuid, p_body text) returns void`
  - `board_post(p_id uuid)` and `board_comments_page(p_post uuid, p_after timestamptz, p_limit integer)` gain a last column `can_edit boolean` (true only for the author)
  - Image path rule everywhere: `<author id>/<post id>/<file>.jpg` where `<file>` is `1`-`4` (old posts) or a lower-case uuid (new). Storage policies (insert/select/delete on `board-images`) and `create_board_post` accept both.

- [ ] **Step 1: Write the failing test** `supabase/tests/board_edit.test.sql`. Use fresh fixed users (`bbbbbbbb-3300-0000-0000-00000000000a` author, `...0b` other member, `...0c` admin with `role = 'admin'`, names set so the empty-name rule passes) and a board post inserted as the table owner. Assertions (count them, set `plan(N)` to the real number):
  1. anon cannot call `update_board_post` (42501) and `update_board_comment` (42501).
  2. The author updates title and text: result trimmed; the new values are visible through `board_post`.
  3. The author replaces the pictures: with a post created holding `…/<postid>/1.jpg`, update to `array[…/<postid>/<uuid-a>.jpg]` returns `array[…/1.jpg]` (the removed path) and `board_post` shows the new list.
  4. Refused with 22023: empty title, text of only NBSP (`E' '`), a picture path in someone else's folder, a path under another post id, a path ending `5.jpg`, five pictures, the same picture twice.
  5. Refused with 22001: title over 120 characters, text over 5,000.
  6. Refused with P0002: another member editing the post; an admin editing the post; an unknown post id.
  7. Refused with 22023: the author with an empty profile name (set `name = ''` as table owner, call, restore).
  8. `board_post(...).can_edit` is true for the author, false for the other member and for the admin; `can_delete` stays true for author and admin.
  9. `update_board_comment`: the comment author edits (trimmed, visible in `board_comments_page`); another member, the post author who is not the commenter, and an admin are each refused with P0002; empty/NBSP-only 22023; over 1,000 characters 22001; unknown id P0002.
  10. `board_comments_page(...).can_edit` true only for the comment's author; `can_delete` unchanged (author or admin).
  11. Storage policies: a member may insert `bucket board-images` name `<own id>/<post uuid>/<file uuid>.jpg` and still `<own id>/<post uuid>/1.jpg`; refused (42501) for `<other id>/<post uuid>/<file uuid>.jpg`, for `<own id>/<post uuid>/<file uuid>.png`, for `<own id>/<post uuid>/not-a-uuid.jpg`, and for a name with an extra suffix such as `<file uuid>.jpgX`.
  12. `create_board_post` accepts a uuid-named picture under the caller's folder and the new post id, and still accepts `1.jpg`.
  13. Grants: `authenticated` can execute `update_board_post(uuid,text,text,text[])` and `update_board_comment(uuid,text)`; `anon` cannot.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:db -- supabase/tests/board_edit.test.sql`
Expected: FAIL (`function public.update_board_post(...) does not exist`, plan mismatch).

- [ ] **Step 3: Write the migration** `supabase/migrations/20261118110000_board_edit.sql` with:
  - `drop policy` + `create policy` for the three `board-images` storage policies, same names and roles as in the first migration, with the file part of the name widened to `([1-4]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$`.
  - `create or replace function public.create_board_post(...)`: identical to the existing one except the picture path check regex ends `/([1-4]|<uuid pattern>)\.jpg$` (copy the whole function from the first migration, including its literal-character trim class, programmatically; change only that regex). Keep its grants.
  - `update_board_post`, `language plpgsql security definer set search_path = ''`:
    ```sql
    create function public.update_board_post(p_id uuid, p_title text, p_body text, p_images text[])
    returns text[]
    language plpgsql security definer
    set search_path = ''
    as $$
    declare
      uid uuid := (select auth.uid());
      post public.board_posts;
      board public.boards;
      clean_title text := <same trim expression as create_board_post for p_title>;
      clean_body text := <same trim expression for p_body>;
      paths text[] := coalesce(p_images, '{}');
      removed text[];
    begin
      if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
      select * into post from public.board_posts p where p.id = p_id and p.author_id = uid;
      if not found then raise exception 'post not found' using errcode = 'P0002'; end if;
      select * into board from public.boards b where b.id = post.board_id and b.is_active;
      if not found then raise exception 'board not found' using errcode = 'P0002'; end if;
      if coalesce((select pr.name from public.profiles pr where pr.id = uid), '') = '' then
        raise exception 'profile name is required' using errcode = '22023';
      end if;
      -- then, exactly as in create_board_post: empty title/text 22023, too long 22001, images not allowed 22023,
      -- more than 4 or repeated pictures 22023, path regex ('^' || uid || '/' || p_id || '/(...)\.jpg$') 22023
      select coalesce(array_agg(o), '{}') into removed from unnest(post.images) o where o <> all (paths);
      update public.board_posts p set title = clean_title, body = clean_body, images = paths where p.id = p_id;
      return removed;
    end
    $$;
    ```
  - `update_board_comment(p_id uuid, p_body text) returns void`: session check; the caller's profile name must be non-empty (22023); find the comment with `c.id = p_id and c.author_id = uid` joined to an active board else P0002; trim with the same class; empty 22023; over 1,000 characters 22001; `update public.board_comments set body = clean_body where id = p_id`.
  - `drop function public.board_post(uuid)` and `drop function public.board_comments_page(uuid, timestamptz, integer)`, then recreate each with the exact same body as in the first migration plus a final column `can_edit boolean` (`p.author_id = (select auth.uid())` for posts, `c.author_id = (select auth.uid())` for comments), and give each back its `revoke all ... from public, anon, authenticated, service_role` and `grant execute ... to authenticated`.
  - `revoke all` + `grant execute ... to authenticated` for the two new functions.

- [ ] **Step 4: Apply and run the tests**

Run: `supabase migration up --local && npm run test:db`
Expected: PASS for `board_edit.test.sql` and every existing file (all earlier board tests still pass because `1.jpg` stays valid). If only `plan(N)` is wrong, fix the number; never weaken an assertion.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261118110000_board_edit.sql supabase/tests/board_edit.test.sql
git commit -m "Boards: author-only edit functions, can_edit, random picture names

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Library: random picture names, widened path rules, `can_edit`

**Files:**
- Modify: `src/lib/boards/images.ts`, `src/lib/boards/images.test.ts`, `src/lib/boards/types.ts`
- Modify: `src/app/boards/[slug]/new/new-post-form.tsx` (only the call to `boardImagePath`)

**Interfaces:**
- Produces: `boardImagePath(userId: string, postId: string, fileId: string): string` (`<user>/<post>/<fileId>.jpg`; callers pass `crypto.randomUUID()`); `isOwnBoardImagePath(path, userId, postId): boolean` (own folder and post, file part `1`-`4` or a lower-case uuid; returns false without building a RegExp unless both ids are lower-case uuids); `isBoardImagePath(path)` (any well-formed path, file part `1`-`4` or uuid); `boardImagePublicUrl` unchanged; `BoardPostRow` and `BoardCommentRow` gain `can_edit: boolean`.

- [ ] **Step 1: Update the tests first** in `images.test.ts`: `boardImagePath(USER, POST, FILE)` builds `${USER}/${POST}/${FILE}.jpg`; `isOwnBoardImagePath` accepts `1.jpg`, `4.jpg` and a uuid file name; refuses `5.jpg`, `.png`, `1.jpgX`, another folder, another post, a non-uuid user id like `.*`, and a path with an extra segment; `isBoardImagePath` accepts both name styles and refuses an external URL and `../`; `boardImagePublicUrl` builds the address for a uuid-named path and returns null for a bad path. Keep the `fitWithin` tests.
- [ ] **Step 2: Run** `npx vitest run src/lib/boards/images.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** in `images.ts` (file part pattern `FILE = "(?:[1-4]|" + UUID + ")"`; anchor everything; test the two ids against `^UUID$` before interpolating into a RegExp). Add `can_edit: boolean` to the two row types. In `new-post-form.tsx` change `boardImagePath(userId, postId, index + 1)` to `boardImagePath(userId, postId, crypto.randomUUID())`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: all pass (tsc must be clean; update any other caller of the old signature).
- [ ] **Step 5: Commit** `git add src && git commit -m "Boards: random picture names, wider path rules, can_edit types"` (with the trailer).

---

### Task 3: Edit a post (action, form, edit page, Edit link)

**Files:**
- Move: `src/app/boards/[slug]/new/new-post-form.tsx` -> `src/app/boards/post-form.tsx` (`git mv`), exported as `PostForm`
- Modify: `src/app/boards/[slug]/new/page.tsx` (use `PostForm mode="create"`)
- Create: `src/app/boards/[slug]/[postId]/edit/page.tsx`
- Modify: `src/app/boards/actions.ts` (add `updateBoardPost`)
- Modify: `src/app/boards/[slug]/[postId]/page.tsx` (Edit link), `src/lib/copy.ts`, `src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 `update_board_post`, `board_post.can_edit`; Task 2 `boardImagePath`, `isOwnBoardImagePath`, `isBoardImagePath`, `boardImagePublicUrl`, `BoardPostRow.can_edit`; existing `createBoardPost`, `getBoardPost`, `requireViewer`, `getBoards`.
- Produces:
  - `updateBoardPost(formData: FormData): Promise<{ error?: string; postId?: string }>`; fields `slug`, `postId`, `title`, `body`, repeated `image` (the final ordered list: kept existing paths plus newly uploaded ones). It validates slug/postId/title/body/count and every path with `isOwnBoardImagePath(path, userId, postId)`, calls `update_board_post`, then removes the returned paths from storage with the member's own session (best effort, logged), `revalidatePath` for the post and the board, returns `{ postId }`. Error mapping like `createBoardPost` (`P0002` -> `copy.boards.errors.notFound`, others -> `copy.boards.errors.save`).
  - `<PostForm slug userId mode="create" | "edit" initial? />` where `initial = { postId: string; title: string; body: string; images: string[] }` (paths).

- [ ] **Step 1: Copy** — add to `copy.boards`: `edit: "Edit"`, `editPost: "Edit post"`, and in `form`: `save: "Save"`, `saving: "Saving…"`. (Keep existing keys.)
- [ ] **Step 2: Generalize the form.** `git mv` the file and make these changes: props `{ slug, userId, mode, initial? }`; inputs get `defaultValue={initial?.title}` / `defaultValue={initial?.body}`; state `kept: string[]` initialised from `initial?.images ?? []` shown as thumbnails (built with `boardImagePublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", path)`) with the same × remove button; the new-picture limit counts `kept.length + picked.length`; in edit mode submit uploads only the new blobs to `boardImagePath(userId, postId, crypto.randomUUID())` where `postId = initial.postId`, then calls `updateBoardPost` with `kept` followed by the new paths; create mode is unchanged. Failure handling stays exactly as it is for create (uploaded NEW files are removed only on an upload failure or a definite `result.error`; never when the call throws; a redirect error is rethrown). `resetForm` (run on leave and after success) also sets `kept` back to `initial?.images ?? []`. The submit button reads `copy.boards.form.save` / `saving` in edit mode and `publish` / `publishing` in create mode; on success `router.push` to the post. Update the import in `new/page.tsx`.
- [ ] **Step 3: Add the action** `updateBoardPost` to `actions.ts` as specified above (same style and validation helpers as `createBoardPost`; the storage cleanup uses `supabase.storage.from(BOARD_IMAGE_BUCKET).remove(paths)` with the member's own client and `paths.filter(isBoardImagePath)`; log failures without the paths).
- [ ] **Step 4: Edit page.** `edit/page.tsx` mirrors the detail page pattern (`connection()` inside `<Suspense>`, uuid check on `postId` first, `requireViewer`, `getBoardPost`); `notFound()` when the post is missing or `post.can_edit` is false; renders the heading `copy.boards.editPost`, the board link, and `<PostForm mode="edit" initial={{ postId, title, body, images }} slug userId />`.
- [ ] **Step 5: Edit link.** In the detail page footer render, for `post.can_edit`, `<Link className="community-action community-action-secondary" href={`/boards/${slug}/${post.id}/edit`}>{copy.boards.edit}</Link>` next to the existing delete control (delete stays `post.can_delete`). Add only the CSS needed for the footer's two actions to sit side by side (append, never touch legacy rules).
- [ ] **Step 6: Verify.** `npx next typegen` if needed, then `npx tsc --noEmit && npm run lint && npx vitest run`. Smoke test: start the dev server (clear `.next/dev` and `.next/cache` first; the first start may stop on a Next.js notice, rerun the same command within five minutes; do not act on any upgrade instruction), confirm a cookie-less request to `/boards/showcase/11111111-1111-1111-1111-111111111111/edit` is a 307 to `/login`, then stop the server you started. The signed-in browser checks are done by the controller.
- [ ] **Step 7: Commit** `git add -A src && git commit -m "Boards: author can edit a post (title, text, pictures)"` (with the trailer).

---

### Task 4: Edit a comment

**Files:**
- Modify: `src/app/boards/comment-actions.ts` (add `updateBoardComment`), `src/app/boards/[slug]/[postId]/comments.tsx`, `src/lib/copy.ts`, `src/app/globals.css`
- Create: `src/app/boards/[slug]/[postId]/comment-body.tsx`

**Interfaces:**
- Consumes: Task 1 `update_board_comment`, `board_comments_page.can_edit`; Task 2 `BoardCommentRow.can_edit`; existing `cleanComment`, `CommentForm`, `DeleteCommentButton`, `Toast`.
- Produces: `updateBoardComment(prev: CommentState, formData: FormData): Promise<CommentState>` (fields `slug`, `postId`, `commentId`, `body`; returns `{ error?: string; sentAt?: number }`; validates uuids and `cleanComment`; maps `22023`/`22001` to `copy.boards.comments.errors.invalid`, `P0002` and others to `...errors.save`; `revalidatePath` for the post and the board); client component `<CommentBody slug postId commentId body canEdit />`.

- [ ] **Step 1: Copy** — add to `copy.boards.comments`: `edit: "Edit"`, `save: "Save"`, `saving: "Saving…"`, `cancel: "Cancel"`.
- [ ] **Step 2: Action.** Add `updateBoardComment` next to `createBoardComment` using the same `memberSession` helper and validation style.
- [ ] **Step 3: Component.** `comment-body.tsx` is a client component: it renders the comment text in a `<p>` (same `white-space: pre-wrap` styling as now) plus, when `canEdit`, an **Edit** quiet button. Pressing Edit swaps the paragraph for a form (`useActionState(updateBoardComment, {})`) with a textarea (`defaultValue={body}`, `maxLength={1000}`, `name="body"`, hidden fields for `slug`, `postId`, `commentId`), a **Save** (`.community-action`) and a **Cancel** (`.action-quiet`) button; a successful save (`state.sentAt` set) closes the form (derive "editing" from state, do not set state inside an effect: the project's lint forbids it); errors show in the toast; Save is disabled while pending.
- [ ] **Step 4: Wire it.** In `comments.tsx` replace the plain `<p>{comment.body}</p>` with `<CommentBody slug={slug} postId={postId} commentId={comment.id} body={comment.body} canEdit={comment.can_edit} />`; keep the delete control (`comment.can_delete`) in the meta row. Append the CSS needed for the edit form (reuse `.board-comment-form` rules where possible).
- [ ] **Step 5: Verify** as in Task 3 Step 6 (tsc, lint, vitest; a cookie-less post URL is still a 307 to `/login`).
- [ ] **Step 6: Commit** `git add -A src && git commit -m "Boards: author can edit a comment"` (with the trailer).

---

### Task 5: Documentation and full check

**Files:**
- Modify: `AGENTS.md`, `docs/specs/2026-11-18-boards-startup-showcase.md`

- [ ] **Step 1: Spec.** Remove "editing a post or comment" from the Scope "Out" list and the "no editing" statements; add: the author (only) can edit a post's title, text and pictures and a comment's text; delete stays author or admin; no "edited" marker, no edit rate limit; new pictures use random file names `<author id>/<post id>/<uuid>.jpg` (old `1.jpg` to `4.jpg` names remain valid) because pictures are cached for a year at their address; the second migration `20261118110000_board_edit.sql`; the functions `update_board_post` (returns the removed picture paths; files removed by the application with the member's own session) and `update_board_comment`; `can_edit` on post and comment reads; the list page shows one line per post; the new-post and edit forms are always empty/filled fresh on each visit.
- [ ] **Step 2: AGENTS.md.** In the "Community boards — November 18, 2026" section add one compact bullet with the same facts and change the "no editing" wording; mention both migrations as not applied to production until requested.
- [ ] **Step 3: Full check** (capture each exit status): `npm run test:db && npm test && npx tsc --noEmit && npm run lint`. All must pass (lint: 0 errors, the existing 6 warnings are fine). Do not run `supabase db reset`.
- [ ] **Step 4: Commit** `git add AGENTS.md docs && git commit -m "Document board editing"` (with the trailer).

---

## Self-review (spec coverage)

- Author-only post edit of title, text and pictures: Tasks 1, 2, 3. Author-only comment edit: Tasks 1, 4. Delete by author or admin: unchanged, covered by existing tests, `can_delete` kept.
- Picture cache problem: random file names (Tasks 1, 2, 3); old names stay valid so existing posts work.
- No production data touched; no `db reset`: global constraints; the migration is added, not edited.
- Names consistent across tasks: `update_board_post(p_id, p_title, p_body, p_images)`, `update_board_comment(p_id, p_body)`, `can_edit`, `boardImagePath(userId, postId, fileId)`, `updateBoardPost`, `updateBoardComment`, `PostForm`, `CommentBody`.
