# Member directory

Issue #17. Phase 5 of `2026-10-22-82startup-platform-design.md`. Where this document and the platform design differ,
this document wins for Phase 5.

## Scope

In:
- `/members`: a directory of members with search by name and company and a filter by type. Login required.
- `/members/[id]`: one member's profile page. Login required.
- A "Show me in the member directory" switch on the profile screen.
- A **Members** link in the header for logged-in users.

Out (later): the admin member list (`/admin/members`), messages, intro requests, company pages, exporting members,
uploading avatars, showing a member's events on their page.

## Decisions (owner, 2026-10-23)

- **Who is listed:** every member who has entered a name, unless they switch themselves out. An empty profile never
  appears. Same style as the attendee list: automatic, with a way to leave.
- **Scope:** the directory only.

## Who can see what

- Visitors see nothing of any profile (unchanged).
- A logged-in member sees the profiles that are listed (`show_in_directory` is on and the name is not empty), their own
  profile always, and admins see every profile. Today the database lets any member read every profile row; this phase
  narrows that so the switch is a real rule, not just a screen. The old policy "members read all profiles" is replaced.
- **Columns:** members read only the public columns of a profile: id, name, avatar, job title, company name, company
  website, bio, LinkedIn URL, member type, `show_in_directory`, created and updated times. The `role` column is no longer
  readable by members (who is an admin is not public). Members can still read their own `role`-free row; admins use the
  existing `is_admin()`.
- **No contact details beyond what the member put on the profile:** the LinkedIn address and company website. The login
  email is never shown.
- **Attendee lists follow the switch.** A member who leaves the directory also disappears from every event's attendee
  list (the attendee counts stay as they are). The per-event "Show me in the attendee list" switch still works for members
  who are in the directory.

## Database

- New column `profiles.show_in_directory` (boolean, not null, default true). Members may update it on their own row (it
  joins the existing column-level update grant); nobody else can.
- The read policy and column grant described above.
- `public.search_members(query, member_type, limit, offset)`: returns the listed members (name, avatar, job title,
  company, type, id) ordered by name (case-insensitive), at most `limit` rows from `offset`, plus the total number of
  matches for paging. It matches `query` against name and company name, case-insensitively and anywhere in the text; a
  `%` or `_` typed by the user is taken literally, never as a wildcard. It runs with the caller's own rights, so the
  row policy applies; it also checks the "listed" rule itself, so the member's own hidden profile does not show in their
  own directory. Only logged-in members may run it. Production grants nothing automatically, so it has explicit grants and
  a test.
- `public.event_attendees` gains the rule that a member who is not in the directory is not listed.

## The pages

- `/members` is rendered at request time. Logged out: sent to `/login?next=/members`. It has a search box, a type
  dropdown (All, Startup, Investor, Student, Corporate, Institution, Other), a **Search** button and **Clear**, a result
  list with 24 members per page, and **Previous** / **Next** links. The state lives in the address (`?q=&type=&page=`) so
  it can be shared. Text is trimmed and cut at 80 characters; an unknown type or a bad page number falls back to
  "All" and page 1. Each card: avatar (or initials), name, "job title · company", type label, linking to the member's
  page. Empty result: "No members found." With nothing typed and nobody listed: "No members yet."
- `/members/[id]`: avatar (or initials), name, job title and company (the company links to its website when set), the
  type, the bio as plain text with line breaks kept, a **LinkedIn** link when set, and an **Edit profile** link on one's own
  page. A malformed id, an unknown member, or a member who is not visible to the caller shows the standard not-found page
  (the same page for all three, so it does not reveal who exists). Links open in a new tab with `rel="noopener noreferrer"`.
- The profile screen gets a checkbox "Show me in the member directory" (on by default) with a line saying a member
  appears only once a name is entered.
- Header: **Members** link between **Events** and the right-hand links, only when logged in.

## Avatars

The avatar address comes from the sign-in provider's data, and a person can put anything there when they sign up by
email. Showing an arbitrary address would let one member see who looks at the directory. So an avatar is shown only
when it is an `https` address on `googleusercontent.com` (where Google profile pictures live); anything else shows the
member's initials. The picture is loaded with `referrerPolicy="no-referrer"`.

## Testing

Tests are written first.
- **Database:** a member reads listed members and their own profile, not an opted-out member and not an empty-name
  member; an admin reads all; a visitor reads none; members cannot read `role` (42501) and can read the public
  columns; the switch defaults to on and a member can change only their own; a member cannot update anyone else's.
  `search_members`: matches name and company case-insensitively, a `%` or `_` in the query is literal, filters by type,
  excludes unlisted and empty-name members and the caller's own hidden profile, orders by name, pages correctly with the
  right total, is refused to visitors; the explicit grants hold. `event_attendees` leaves out a member who left the
  directory. The existing profile and attendee tests still pass.
- **Unit:** reading the search address (trim, length cut, unknown type, bad or huge page numbers); the avatar rule (Google
  host accepted, other hosts, `http`, `javascript:`, empty, and a look-alike host such as `evil-googleusercontent.com` all
  handled correctly); initials from a name (one word, two words, empty, non-Latin); the profile form reads the checkbox.
- **Browser QA (local):** as a visitor (redirected), as a member (list, search by name and by company, wildcard text typed
  literally, type filter, paging with seeded members, member page, not-found page, own page with the edit link), leaving the
  directory and disappearing from the list and from an event's attendee list while the count stays, an avatar from another
  host showing initials, 375px width.

## Release

Merge; the owner runs `supabase db push --linked`; on production check `/members` and the owner's own page, switch the
owner out of the directory and back, and, as a visitor, that `/members` redirects to login and the profile REST address
refuses a visitor. No new environment variable.
