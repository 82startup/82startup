# Profile photo upload — implementation plan

> Tests first in every task. Nothing is committed or pushed until the owner says "ship it" (Task 7).

**Goal:** Members upload a profile photo that the browser crops to a centred square and shrinks to a small JPEG; it is stored in a
public bucket under a random name and shown in the directory, member page, profile and attendee list.

**Spec:** `docs/specs/2026-10-23-20-profile-photo.md` (approved).

## Global constraints

- Production grants nothing automatically; storage rules are policies on `storage.objects` plus bucket settings, and a database test proves them.
- The stored file is at most 200 KB and `image/jpeg` (enforced by the bucket); the browser targets 150 KB or less at 400 x 400.
- A member may add or delete objects only at `<own account id>/<random uuid>.jpg` in bucket `avatars`; nobody can overwrite or list.
- The server action accepts only a path of exactly that shape for the caller's own id; it sets `profiles.avatar_url` to this project's public address
  and deletes the previous uploaded file. If recording fails, the new file is deleted again.
- Avatars are shown only from `googleusercontent.com` (https) or this project's own `avatars` public path.
- Only the member's own session is used (no service role).
- New text goes in `src/lib/copy.ts`, English.

## Files

| File | Responsibility |
|---|---|
| `supabase/migrations/20261023110000_profile_photos.sql` | bucket, storage rules, `event_attendees` returns the avatar |
| `supabase/tests/profile_photos.test.sql` | bucket, storage rules, attendee avatar |
| `src/lib/profile/photo.ts` (+ test) | constants, `checkSourceFile`, `squareCrop`, `nextQuality`, `avatarPath`, `isOwnAvatarPath`, `avatarPublicUrl`, `pathFromAvatarUrl` |
| `src/lib/members/avatar.ts` (+ test) | `safeAvatarUrl` also accepts this project's bucket |
| `src/lib/profile/resize.ts` | browser-only: decode, crop, draw 400 x 400, encode JPEG within the size limit |
| `src/app/profile/photo-actions.ts` (+ test) | `setAvatar`, `removeAvatar` |
| `src/app/profile/photo-section.tsx`, `page.tsx` | the screen |
| `src/app/events/[slug]/attendance.tsx`, `src/lib/copy.ts` | small pictures in the attendee list, text |

## Task 1: Database (tests first)

- [ ] `profile_photos.test.sql`: the `avatars` bucket exists, is public, `file_size_limit` is 204800 and `allowed_mime_types` is `{image/jpeg}`; as member A: insert
  into `storage.objects` at `A/<uuid>.jpg` in `avatars` works; at `B/<uuid>.jpg` fails (`42501`); at the bucket root fails; a nested folder fails; a `.png` name fails;
  a name that is not a uuid fails; in another bucket fails; as a visitor fails; A can delete own object and a delete aimed at B's object removes nothing; an
  update (rename) of A's object changes nothing. `event_attendees` returns `avatar_url` and still lists only members who are in the directory and the list.
- [ ] Run, expect FAIL. Migration: insert the bucket (on conflict update the settings); `create policy` for `insert` (with check: bucket, and name matches
  `'^' || auth.uid() || '/<uuid pattern>\.jpg$'`) and for `delete` (using: same), plus a `select` policy limited to the member's own folder if the storage delete needs it
  (find out by testing the real delete in Task 5); `drop function public.event_attendees(uuid)` and recreate it with `avatar_url text` added to the returned
  columns, then `revoke all ... from public, anon, authenticated, service_role` and `grant execute ... to authenticated`.
- [ ] Reset, run all database tests, expect PASS. Production-like check: revoke the new grant, tests fail, reset.

## Task 2: Pure helpers (tests first)

- [ ] `photo.test.ts`: `checkSourceFile` accepts jpeg, png and webp up to 15 MB, returns `type` for others (heic, gif, svg, empty type) and `size` above 15 MB or 0 bytes;
  `squareCrop(4000, 3000)` is `{ sx: 500, sy: 0, size: 3000 }`, portrait `(3000, 4000)` is `{ sx: 0, sy: 500, size: 3000 }`, square and 1 x 1 work, odd sizes round down
  to whole pixels; `nextQuality(0.82)` is 0.72, then 0.62, 0.52, then `null`; an unknown quality gives `null`; `avatarPath(uid, id)` is `<uid>/<id>.jpg`;
  `isOwnAvatarPath` accepts exactly `<own uid>/<lowercase uuid>.jpg` and rejects another uid, `..`, nested folders, an upper-case uuid, other extensions, extra text, an empty string;
  `avatarPublicUrl(base, path)` builds `<base>/storage/v1/object/public/avatars/<path>`; `pathFromAvatarUrl(url, base)` returns the path for this project's addresses and `null`
  for anything else (other host, other bucket, Google, `null`, garbage).
- [ ] `avatar.test.ts` gains: with `https://proj.supabase.co` as the own address, `https://proj.supabase.co/storage/v1/object/public/avatars/a/b.jpg` is accepted; other buckets,
  other hosts, `http` for an https project, a look-alike host, credentials, and a path that only starts the same (`.../avatars-evil/x.jpg`) are rejected; an `http://127.0.0.1:55321`
  own address accepts its own bucket path (local development); Google still works.
- [ ] Implement `photo.ts` and extend `safeAvatarUrl(url, ownUrl = process.env.NEXT_PUBLIC_SUPABASE_URL)`.

## Task 3: The browser step

- [ ] `resize.ts`: `makeAvatarBlob(file)` decodes with `createImageBitmap(file, { imageOrientation: "from-image" })`, cuts `squareCrop`, draws 400 x 400 on a canvas, encodes JPEG at the
  qualities from `nextQuality` until the blob is at most 150 KB (or the floor is reached and it is still at most 200 KB; otherwise it throws), and returns `{ blob, previewUrl }`.
  Typed errors for a file that cannot be decoded and for one that cannot be made small enough. Not unit-tested (browser APIs); covered in Task 5.

## Task 4: Server actions (tests first)

- [ ] `photo-actions.test.ts` (mock `@/lib/supabase/server`, `next/cache`, `next/navigation`): `setAvatar` — logged out redirects to login and changes nothing; a path that is not the caller's own
  (other uid, `..`, nested, wrong extension) returns an error and touches nothing; a valid path updates `profiles.avatar_url` to the public address, deletes the previous uploaded file (not a Google
  address, not the same file), revalidates `/profile`; if the update fails the new file is removed again and an error is returned (never the database text); `removeAvatar` — clears
  `avatar_url`, deletes the file only when it is one of ours, returns an error on failure; a Google avatar is cleared without any storage call.
- [ ] Implement `photo-actions.ts` (`"use server"`), reading `NEXT_PUBLIC_SUPABASE_URL` for the public address.

## Task 5: The screen, attendee pictures, browser QA

- [ ] `copy.ts`: a `photo` block (title, choose, preview, save, cancel, remove, saving, hints and the errors: type, size, decode, too large to shrink, upload failed, save failed).
  `photo-section.tsx` (client) with the file input (`accept="image/jpeg,image/png,image/webp"`), preview, **Save photo** (upload with the browser client to `<uid>/<uuid>.jpg`, then the server action), **Cancel**,
  **Remove photo**; `profile/page.tsx` selects `avatar_url`, passes the user id and shows the section above the form. `attendance.tsx` shows a 28 px `Avatar` for each name.
- [ ] `npm run lint && npm test && npm run build && npx tsc --noEmit`.
- [ ] Browser QA (local): a landscape and a portrait test picture of several MB: preview is square, the saved file is JPEG, 400 x 400 and under 150 KB (read from storage), it shows on the profile,
  directory, member page and attendee list; replace it (old file gone); remove it (initials; file gone); a `.gif` and a huge file are refused with a clear message; a file uploaded by hand into another
  member's folder is refused (REST); the storage delete works with the rules as written; 375px width.

## Task 6: Final checks and handover

- [ ] All checks pass; notify; report; wait for "ship it".

## Task 7: Release (after "ship it")

- [ ] Commit (spec and plan, then code), push, PR (`Closes #20`), checks, merge. The owner runs `supabase db push --linked`. Then on production: the migration list, the bucket settings, the owner uploads a photo;
  I read back its stored size and path (no image content), check a stranger's upload is refused, and the visitor and member rules; close the issue, remove the worktree.
