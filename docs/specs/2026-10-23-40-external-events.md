# Events from other Luma calendars and other websites, added by link

Issue #40 (approved by the owner, 2026-10-24). An admin pastes the link of any event, from another Luma calendar or another site such as
Eventbrite, and it appears on the site like the others. Extends `2026-10-23-7-events-import.md` (our own calendar's events work as before)
and `2026-10-23-15-attendees.md`.

## Decisions (owner)
- A Luma link that is not our calendar works. A link from another site (for example Eventbrite) works the same way.
- Admins only add events (members cannot); details are read from the page once, when the link is added, and again only on **Refresh from link**.
- Pictures are linked from the other site (https only), not copied. Attendance is self-reported only.

## How it works
- **Admin** (`/admin/events`): **Add an event by link**: paste a link, **Read link**; a preview form (title, start, end, timezone, online/in person, venue, city, address,
  cover address, description) is filled from the page for the admin to check and change; **Save**. If the page cannot be read or is not an event page, the form can be filled
  by hand. Each external event in the list has **Refresh from link**, **Edit**, **Hidden**, **Featured** and **Delete** (with its self-reported attendance).
- **Reading a page**: schema.org `Event` data (single object, array, `@graph`, any `...Event` type), otherwise the page's title, description and picture tags.
  A missing date must be typed in. A time with an offset picks the zone from a list of common zones. All text is plain text within the database limits.
- **Duplicates**: the same address (tracking parameters, fragment, `www`-less host, `lu.ma` = `luma.com` and trailing slash are ignored) cannot be added twice, and an event that is
  already in our own Luma calendar is refused.
- **Public**: external events are in Events, on the home page when featured or upcoming, and have their own page with a small **Added from Eventbrite** label; the main button
  is **Get tickets** to the original page; the Luma-email registration note is not shown; **I'm attending**, the attendee count and list work (self-reported); the profile's
  **Attending** list includes them. Covers load with no referrer.

## Safety (the server fetches an address an admin typed)
Only https on the standard port, no credentials; the host must be a name with a dot (no IP addresses, no `localhost`); the connection itself only goes to public addresses
(every address the name points to is checked, private, loopback, link-local, metadata and reserved ranges refused, IPv4 and IPv6, including addresses carrying an IPv4
address); at most 3 redirects, each checked again; 5 seconds, 2 MB, HTML answers only; no cookies or keys are sent; the page is only parsed for data, nothing of it
is ever run or shown as HTML.

## Database
`events.source` (`luma` for all existing rows, or `external`), `external_url` (unique), `external_host`; `luma_event_id` empty for external rows; checks tie the two shapes
together and limit the external text. The Luma sync only reads `source = 'luma'` rows. Admins add, change and delete external events only through
`admin_save_external_event` and `admin_delete_external_event` (admin-checked inside, never an event from our own calendar). Visitors read `source` and `external_host`; the
original link is the ticket link (`luma_url`).

## Testing
Database (36 checks), unit tests for the address rules, the IP rules, the fetcher (fake connection), the page reader, the time zone helpers, the form, the admin actions and
the public cards; browser QA with a real event added from another Luma calendar and refused links (http, localhost, 127.0.0.1, the cloud metadata address, our own calendar's event).

## Release
Migration first (`supabase db push --linked`, confirm it shows on production), then merge. No new secret.
