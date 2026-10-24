# Speakers: simpler fields and several events

Issue #51 (owner request, 2026-10-24). Amends `2026-10-23-44-sponsors-speakers.md` for speakers.

- A speaker has a **name, job title, company and photo** only. Bio, LinkedIn and website are removed (the columns are dropped; the existing values are discarded).
- **Speaks at** takes **several events**, chosen with checkboxes, and **only events from our own calendar** (not the ones added by link from other sites). The speaker's page lists them,
  soonest first; hidden events are not shown.
- A new link table `speaker_events` replaces the single `event_id`; an event a speaker already had is moved into it by the migration. Everyone who can see a speaker sees the links;
  only admins change them, all at once, through `admin_set_speaker_events` (which refuses events from other sites and unknown events).

Tests: database (links, who can read or change them, cascades, refusing external events), the form parser, the admin action, and a browser check with a speaker linked to several events.
Release: migration first (`supabase db push --linked`), confirm it shows on production, then merge.
