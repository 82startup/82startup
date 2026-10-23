# Profile photo upload

Issue #20. Members can upload a profile photo, like on LinkedIn. The browser crops it to a square and shrinks it before
upload, so what is stored is small. Other people can see it. Builds on the member directory
(`2026-10-23-17-member-directory.md`); where this document and that one differ, this one wins for avatars.

## Scope

In:
- A "Profile photo" section on the profile screen: choose a picture, see a preview, save it, or remove it.
- The photo shows in the member directory, on a member's page, on the profile screen, and (small) in an event's attendee
  list.

Out: a zoom or drag-to-position editor, filters, several photos, importing from LinkedIn, storing the original picture.

## Decisions (owner, 2026-10-23)

- **Anyone who knows the address can see a photo.** The photo is stored in a public bucket under a long random name that
  cannot be guessed. There is no login check when the picture itself is fetched.
- **Crop and preview:** the picture is cut to a centred square automatically and a preview is shown before saving.

What the owner accepted with the first decision, stated plainly: the address of a photo works for anyone who has it, even
logged out, and leaving the member directory does not make an address stop working. Only **Remove photo** (which deletes the
file) or replacing it does.

## How a photo is made small

- The browser reads the chosen file (JPEG, PNG or WebP, up to 15 MB; anything else is refused with a clear message, for
  example HEIC), applies the camera's rotation, cuts the largest centred square, draws it at **400 × 400** and saves it as
  **JPEG**. It starts at quality 0.82 and steps down (0.72, 0.62, 0.52) until the file is **150 KB or less** (usually
  30-60 KB).
- The original is never uploaded or stored. Re-drawing the picture also drops its hidden camera data (location, device).
- The storage itself refuses anything over **200 KB** or that is not JPEG, so a modified browser cannot store more.

## Storage and rules

- A bucket `avatars`, public for reading, limited to 200 KB and `image/jpeg`, created by the migration.
- Rules on its objects: a logged-in member may **add** an object only inside a folder named with their own account id, and
  may **delete** objects only in that folder. Nobody can overwrite, and there is no rule that lets anyone list the bucket.
- File name: `<account id>/<random id>.jpg`, a new random name for every upload, so a replaced photo does not stay cached.
- The photo address is saved in the existing `profiles.avatar_url`. Replacing or removing a photo deletes the member's
  previous file, so old pictures do not pile up. A Google picture from sign-in stays until the member uploads their own.

## Saving

1. The browser uploads the small JPEG straight to the bucket with the member's own session (the rules above apply).
2. A server action then records it: it checks the member is logged in, checks that the path is exactly their folder and a
   random `.jpg` name (so no one can point their profile at someone else's file or at another address), sets `avatar_url` to
   the photo address, deletes their previous uploaded file, and refreshes the pages that show it.
3. **Remove photo** is a server action that clears `avatar_url` and deletes the file.
If step 2 fails after step 1 worked, the new file is deleted again so nothing is left orphaned.

## Which avatar addresses are shown

The member directory rule becomes: an `https` address is shown only if it is on `googleusercontent.com` (Google sign-in) or
is a photo in this project's own `avatars` bucket (the configured Supabase address plus
`/storage/v1/object/public/avatars/`). Anything else shows initials, as before. `avatar_url` can still be set to any text by a
modified client, so this rule at display time stays the protection.

## The pages

- Profile screen: the current picture (or initials), **Choose photo**, the preview with **Save photo** and **Cancel**, and
  **Remove photo** when there is one of ours. Errors say what to do (wrong type, too large, could not read, could not save).
- Attendee list: each name gets a small round picture (or initials). The database function behind the list also returns the
  avatar address; it still lists only members who are in the directory and in the list.
- Directory and member page already use the avatar component; they pick the new rule up.

## Testing

Tests are written first.
- **Database:** the bucket exists, is public, allows only `image/jpeg` and at most 200 KB; a member can add an object in
  their own folder and not in someone else's folder, not at the bucket root, not in another bucket; a visitor cannot add;
  a member can delete only their own folder's objects; nobody can update (overwrite); the attendee-list function returns the
  avatar address and still respects the directory switch.
- **Unit:** the square crop numbers (landscape, portrait, square, tiny); file checks (type, size); the quality steps stop at
  the first that fits and never go below the floor; the object path builder and the server's path check (own folder, random
  `.jpg`, rejects `..`, other folders, wrong extension, wrong length); the avatar address rule (Google host, own bucket path
  accepted; other hosts, other buckets, `http`, look-alike hosts, credentials rejected).
- **Browser QA (local):** upload a large phone-sized picture (several MB, landscape and portrait): the preview is square, the
  saved file is under 150 KB and 400 × 400, it shows on the profile, the directory, the member page and the attendee list;
  replace it (the old file is gone); remove it (initials again, file gone); wrong type and too-large refusals; a picture
  uploaded by hand into someone else's folder is refused; 375px width.
- **Live check:** on production after release, the owner uploads their own photo; the stored size is read back from the
  storage table (size only).

## Release

Merge; the owner runs `supabase db push --linked` (creates the bucket and its rules); the owner uploads a photo on
`/profile`, checks it on `/members/<own id>`, replaces it, and removes it or keeps it. No new environment variable.
Storage use is about 30-60 KB per member, well inside the free plan.
