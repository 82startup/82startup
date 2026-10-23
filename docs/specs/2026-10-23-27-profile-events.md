# Upcoming events a member is attending, on their profile

Issue #27. First of four threads the owner asked for (profile events #27 → connections #28 → chat #29 → posts as messages
#30), so members can find each other at an event and meet. Builds on `2026-10-23-15-attendees.md` and
`2026-10-23-17-member-directory.md`; their rules still stand.

## Scope

In: on a member's profile page (`/members/[id]`), a section **Attending** that lists the upcoming events that member is
going to, each linking to the event page. Their own profile shows the same list.
Out: past events, any change to how someone marks attendance, notifications, a "who else is going" shortcut from the
profile (the event page already lists attendees), changes to cards, the directory or the home page.

## Decisions (owner, 2026-10-23)

- Shown to **every logged-in member**, **upcoming events only**. A past event disappears from the list when it ends.

## What the profile shows

- A heading **Attending** and up to 20 events, soonest first: title (a link to `/events/<slug>`) and date and time in the
  event's own timezone, the same format the event page uses.
- If the member is going to nothing upcoming, the section is not shown at all (no empty box).
- The section is for members only; visitors never reach profiles.

## Which events count (the privacy rules already in the product, reused)

An event is listed for a member only when all of these hold:
- the member has a `registered` row for it, from Luma or from **I'm attending**;
- the member's per-event switch **Show me in the attendee list** is on (turning it off hides the event here too);
- the member is listed in the directory (`show_in_directory` and a name), or the viewer is that member or an admin;
- the event is published, not hidden, not removed from Luma, and has not ended.

So a member who hides themselves from an event, or from the directory, is not revealed by this section. Nothing new needs
to be switched.

## Database

No new table. One new function, **`member_events(p_member uuid)`**, `security definer`, `set search_path = ''`: returns
`event_id, slug, title, start_at, end_at, timezone` for the rules above, ordered by `start_at` then id, at most 20 rows. It
returns nothing when the caller is not signed in. Execute is revoked from public, anon, service_role and granted to
`authenticated` only (production grants nothing automatically). One timestamped migration; no data change.

## Testing (tests first)

- **Database:** a registered, shown, upcoming event is returned; an ended, hidden, removed or unpublished event is not; a
  `cancelled` registration is not; **Show me in the attendee list** off hides it; a member who left the directory returns
  nothing to other members but still returns their own list to themselves; an admin sees the listed rules the same way; no
  rows for anon; ordering and the 20 limit; a production-like check (all default grants revoked, only the explicit ones remain).
- **Unit:** the section renders titles as links with the right date and is absent when the list is empty.
- **Browser QA (local):** a member with two upcoming events and one past event; own profile and another member's; one event
  switched off; a member with none; 375px width.
- **Live:** after release, mark yourself attending an upcoming event and open your profile.

## Release

Merge; the owner runs `supabase db push --linked` (before the merge, as with #24, because the page calls the function);
verify on production.
