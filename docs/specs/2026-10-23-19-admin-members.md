# Admin member list

Issue #19. The last item of the admin screens in `2026-10-22-82startup-platform-design.md` (`/admin/members`, read-only
member list). Where this document and the platform design differ, this document wins.

## Scope

In: a read-only list of every member for admins, with search and paging, and a small switch between the two admin
screens (Events, Members).

Out: changing a role, deleting or blocking a member, exporting, emailing members, anything the admin could do to a
member. This screen only shows.

## What it shows

`/admin/members`, one row per member, newest first:

| Column | Notes |
|---|---|
| Name | "—" when the member has not entered one |
| Email | the login email; only admins ever see it |
| Role | Member or Admin |
| Type | the member type, empty when not chosen |
| Directory | **Yes**, **No** (the member switched themselves out) or **No name** (nothing to list yet) |
| Joined | the date the account was created |
| Last sign-in | date, or "never" |

A search box matches name or email (case-insensitive, anywhere in the text, `%` and `_` typed by the admin are literal).
50 members per page with **Previous** / **Next**, the total count at the top, state in the address (`?q=&page=`).
Admins see every member, including those who are not in the directory.

## Who can see it

- Logged out: sent to `/login?next=/admin/members`. Logged in but not an admin: the standard not-found page (the screen
  is not revealed). Same rule as `/admin/events`.
- The database enforces it too: the data comes from a function that returns rows only when the caller is an admin.

## Database

`public.admin_members(query, limit, offset)`, `security definer` (it must read the login email, which is in the
authentication tables and not in `profiles`): returns the columns above plus the total number of matches, only when
`is_admin()` is true and nothing otherwise. `limit` is clamped to 100. The query text is trimmed, cut at 80 characters and
matched literally. Explicit grants: `authenticated` only (production grants nothing automatically). No table or column
grants change, so members still cannot read emails or roles.

## The screens

- The two admin screens get a small navigation line at the top: **Events** and **Members**, the current one marked. The
  header **Admin** link keeps pointing to `/admin/events`.
- Nothing about the screen is in the static page shell; it is rendered at request time like the events screen.
- The email is shown as plain text (not a link) and is never put in a log line, an error message or the address.

## Testing

Tests are written first.
- **Database:** a visitor cannot call the function (`42501`); a member gets no rows; an admin gets every member
  including a member who left the directory and one with no name; the email, role, joined and last sign-in values are
  right; search by name and by email, case-insensitive; `%` and `_` are literal; a blank query lists everyone; paging and
  total; the limit is clamped; the directory flag text cases (Yes, No, No name) come out right; the explicit grants hold;
  members still cannot select the `role` column of `profiles`.
- **Unit:** the search address reading (reuses the member search parser for `q` and `page`, with 50 per page), the label
  helper for the Directory column and for dates.
- **Browser QA (local):** as a visitor (redirect), as a member (not-found), as an admin (list, search by name and email,
  a literal `%`, paging with seeded members, the Directory labels, the Events/Members switch), 375px width.

## Release

Merge; the owner runs `supabase db push --linked`; the owner opens `/admin/members` and sees themself; a visitor still
sees a login redirect and a member sees not-found. No new environment variable.
