# Sponsors and speakers, with admin pages

Issue #44. Like tech-week.com, the site gets a **Sponsors** section (grouped by tier, with logos and descriptions) and a **Speakers** section
(photos, names, titles), each with its own page, and admin pages to manage both. Visitors can see them without signing in.

## Scope

In: public Sponsors and Speakers sections on the home page and their own pages (`/sponsors`, `/speakers`, `/speakers/[slug]`); an admin page for
each to add, edit, hide, reorder and delete entries and upload a logo or photo; a "become a sponsor" call to action.
Out: members applying to speak or sponsor through the site, payments or contracts, sponsor analytics, per-event schedules or agendas, a speaker
carousel with animation (a plain grid is used), email to sponsors or speakers.

## What visitors see

- **Home page:** after Featured and Upcoming events, a **Sponsors** section and a **Featured speakers** section (only if there is something to show), each with a **See all** link.
- **`/sponsors`:** a heading, then groups by tier in this order: **Platinum**, **Gold**, **Silver**, **Bronze**. Platinum sponsors are large: logo and the
  description (up to 600 characters) and a link to their website. Gold are medium (logo, name, a short line). Silver and Bronze are a grid of logos (name on hover and as the
  picture's text). A tier with no sponsors is not shown. At the end: **Interested in sponsoring? Reach out** with a button to the contact link the admin set (assumption 5).
- **`/speakers`:** a grid of cards: photo, name, job title and company. Cards are in the order the admin set. Each card opens `/speakers/[slug]`.
- **`/speakers/[slug]`:** photo, name, job title and company, bio (plain text, up to 1,000 characters), links (LinkedIn, website), and, if the admin linked one, the event
  they speak at with a link to that event's page.
- Logos and photos load lazily, are never wider than the screen, and have the sponsor's or speaker's name as their text. 375px width works; nothing scrolls sideways.
- Hidden entries are not shown anywhere.

## Admin pages

- The admin header gets **Sponsors** and **Speakers** next to **Events** and **Members**. Only admins can open them (anyone else gets "not found", as with the other admin pages).
- **`/admin/sponsors`:** the list in display order with each entry's tier and a **Hidden** mark; **Add sponsor**; per row **Edit**, **Hide/Show**, **Move up/down**, **Delete** (with a confirmation).
  The form: name (required, 100), tier (Platinum, Gold, Silver, Bronze), website (https, optional), description (up to 600, optional), logo (upload).
  A box **Sponsor contact link** (an https link or a `mailto:` address) for the call to action.
- **`/admin/speakers`:** the same shape: name (required, 100), job title (120), company (100), bio (up to 1,000), photo (upload), LinkedIn (linkedin.com, https), website (https), and
  an optional **event** chosen from the list of events. A slug for the speaker's page is made from the name and kept stable when the name is edited later.
- Saving shows what changed on the public pages at once (the pages' cache is refreshed).
- Order is set with **Move up / Move down** (no dragging).

## Pictures

- Admins upload a logo or photo: JPEG, PNG or WebP, **up to 500 KB** (SVG is not accepted, because it can carry scripts). It is stored in a new public storage bucket `site-images`,
  in a folder per kind (`sponsors/`, `speakers/`), under a random name. Only admins can add, replace or delete files there; anyone can read them.
- The public pages draw only pictures that live in that bucket (never a picture from another address), with `loading="lazy"` and no referrer.
- Deleting an entry deletes its picture. Replacing a picture deletes the old one.

## Database (one migration; explicit grants for production)

- **`sponsors`**: `id`, `name`, `tier` (`platinum` | `gold` | `silver` | `bronze`), `website_url`, `description`, `logo_url`, `sort_order`, `visible` (default true), timestamps.
- **`speakers`**: `id`, `slug` (unique), `name`, `job_title`, `company`, `bio`, `photo_url`, `linkedin_url`, `website_url`, `event_id` (→ `events`, set null when the event goes), `sort_order`, `visible`, timestamps.
- **`site_settings`**: `key` (primary key) and `value`, used for the sponsor contact link; only the keys the code knows can be set.
- Row rules: visitors and members **read only visible rows**, only the public columns; **only admins** (the existing `is_admin()`) add, change or delete. Length and format limits are
  enforced by the database, not only by the screens (names, URLs must be https, tier list, description and bio lengths).
- The storage bucket `site-images` with its policies (public read, admin-only write, 500 KB, the three picture types).
- Explicit grants for `anon`, `authenticated` and `service_role` (production grants nothing automatically) and a test for them.

## Testing (tests first)

- **Database:** visitors and members read visible rows and not hidden ones; members and visitors cannot write; an admin can add, edit, reorder, hide and delete; limits and the https-only
  rule refuse bad data; a speaker linked to an event keeps working when the event goes (link cleared); slug uniqueness; only known settings keys; the bucket accepts an admin's upload and
  refuses a non-admin's, an over-size file and an SVG; a production-like grant check.
- **Unit:** the forms' validation (every limit), slug creation, grouping and ordering of sponsors by tier, the safe picture rule (only our bucket), the contact link check (https or `mailto:` only),
  the public pages' rendering (tier groups, empty tiers hidden, escaped text), the admin actions (admin only, refresh after save, delete removes the picture).
- **Browser QA (local):** as an admin add two sponsors in different tiers and two speakers (one linked to an event), upload pictures, reorder, hide, edit, delete; check the home page, `/sponsors`, `/speakers`
  and a speaker page as a visitor; a non-admin cannot open the admin pages; an oversize picture and an SVG are refused; 375px width.
- **Live:** after release, the owner adds the first real sponsor and speaker.

## Release

Migration first (`supabase db push --linked`), then merge, verify on production. No new secret or service.

## Assumptions to confirm (change any before approving)

1. **Sponsors and speakers belong to the whole site**, not to one event (so they show on the home page). A speaker can optionally be linked to an event.
2. **Four tiers**: Platinum, Gold, Silver, Bronze (tech-week.com uses Platinum, Gold and Bronze). Tell me if you want different names or fewer.
3. **Speakers get their own page** (photo, bio, links, event), not only a card.
4. **Pictures are uploaded by the admin** (500 KB, JPEG/PNG/WebP, no SVG), not linked from other sites.
5. **The "Reach out" button goes to a contact link you set** on the admin sponsors page (for example a `mailto:` address or a form link). Until one is set, the button is not shown.
6. **Only admins manage entries**; there is no application form for members or companies in this version.
