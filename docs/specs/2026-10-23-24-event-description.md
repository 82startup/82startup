# Event descriptions with their photos and formatting

Issue #24. The event page shows a Luma event's description as plain text, so photos, links, bold text, headings and lists written in
Luma are lost (the owner added a photo to the Summit 2027 description and it did not show). This shows the description the way it is
written in Luma. It changes the "plain text, never parsed as HTML" rule of `2026-10-23-7-events-import.md`; the rest of that spec stands.

## Scope

In: storing Luma's formatted (markdown) description and showing it, safely, on the event page.
Out: editing descriptions on the site, showing descriptions on cards, `/events` or the home page, rendering anything but text, links,
lists, headings, emphasis, quotes, code and pictures (no tables, embedded video or raw HTML).

## What changes for a visitor

- The event page shows the description with its paragraphs, headings, bold and italic text, lists, quotes, links and pictures.
- A picture in the description appears at the width of the page, never wider, loaded lazily.
- Everything else about the page is unchanged. The share preview (page title, description text, cover) still uses the plain text.
- If an event has no formatted description (older rows until the next sync, or an event that has none), the plain text is shown as before.

## Where it comes from

Luma's event details carry the description twice: `description` (plain text) and `description_md` (markdown with the pictures and formatting).
The sync already reads the details for new and not-yet-ended events; it now also stores `description_md`, cut at 20,000 characters. Events that
have ended keep what they had. The hourly sync fills the existing events on its next run (and **Sync now** does it at once). The Luma webhook work
(#23) will use the same step, so no extra change is needed there.

## Database

One migration: `events.description_md` (text, not null, default empty). The public column grant is a list, so the new column is added to it
explicitly for visitors and members (production grants nothing automatically); a test proves a visitor can read it and still cannot read the sync
columns. `admin_events()` already returns whole rows.

## How it is shown, and why it is safe

The description is written by whoever edits the event in Luma, so it is treated as untrusted text.
- It is drawn with a markdown library (`react-markdown`) with raw HTML switched off: a `<script>` or any HTML tag in the text is dropped and
  never reaches the page.
- **Links:** only `https:`, `http:` and `mailto:` addresses; `javascript:` and everything else is shown as plain text. Links open in a new tab with
  `rel="noopener noreferrer nofollow"`.
- **Pictures:** only `https` pictures on Luma's own picture hosts (`images.lumacdn.com`, `cdn.lu.ma`). A picture from anywhere else is not loaded; its
  alt text is shown instead. Pictures use `referrerPolicy="no-referrer"` and `loading="lazy"`. (An arbitrary picture address would tell its owner who
  reads the page.)
- **Headings** are shifted down (a `#` in the description becomes a `<h2>`, `##` an `<h3>`, and so on, never above `<h6>`), so the page keeps one `<h1>`.
- Long unbroken text and wide pictures never make the page scroll sideways.

## Dependency

Adds `react-markdown` (10.x, supports React 19). Nothing else new. It is rendered on the server (a server component), so it adds nothing to what the
browser downloads.

## Testing

Tests are written first.
- **Unit, the rules:** link check (https, http, mailto accepted; `javascript:`, `data:`, `vbscript:`, relative and empty rejected); picture check (the
  two Luma hosts accepted over https; other hosts, `http`, look-alike hosts such as `images.lumacdn.com.evil.example` and `evil-lumacdn.com`,
  credentials, and `data:` rejected); heading shift.
- **Unit, the output** (the component rendered to HTML in the test): a paragraph, bold, a list and a link come out right; a raw `<script>` and
  `<iframe>` are gone; an `onerror` attribute never appears; a `javascript:` link is not a link; a Luma picture keeps `loading="lazy"` and
  `referrerpolicy="no-referrer"`; an outside picture is replaced by its alt text; `#` becomes `<h2>`; a long description is handled.
- **Unit, the sync:** `description_md` is stored from the details, cut at 20,000 characters, not sent for an event that has ended, and the existing
  sync tests still pass.
- **Database:** the column exists with an empty default; visitors and members read it; visitors still cannot read the sync columns.
- **Browser QA (local):** an event whose markdown has headings, bold, a list, a link, a Luma picture, an outside picture, a `javascript:` link
  and raw HTML: it shows as described; an event with only plain text is unchanged; 375px width with a wide picture and a long word.
- **Live:** after release, **Sync now**, then the Summit 2027 page shows the photo.

## Release

Merge; the owner runs `supabase db push --linked`; press **Sync now** on `/admin/events`; open the Summit 2027 page and see the description with its
photo. No new environment variable.
