# Profile fields — "I am" options, job title, company website

Issue #5. Follow-up to Phase 1 (auth and profiles), requested by the owner after testing profile save on
production. Changes the `profiles` data model in `2026-10-22-82startup-platform-design.md` (Data model, Member
screens).

## Changes

1. **I am** (`member_type`) options become: `startup`, `investor`, `student`, `corporate`, `institution`,
   `other`. Shown as Startup, Investor, Student, Corporate, Institution, Other. Still empty until the member
   chooses; still optional on save.
2. **Headline** becomes **What is your job title**. The column `headline` is renamed `job_title`; max 120
   characters, as before.
3. New optional **Company Website** (`company_website`): empty or an `http://` / `https://` address, max 200
   characters. Stored as `null` when empty. Same handling as the LinkedIn URL.

Everything else on the profile (name, company name, bio, LinkedIn URL, access rules) is unchanged. Members still
cannot change `role`.

## Database (one timestamped migration)

- Postgres cannot remove values from an enum, so the migration creates a new `member_type` enum with the six new
  values, converts the column with an explicit mapping, then drops the old type:

  | old | new |
  |---|---|
  | `founder` | `startup` |
  | `investor` | `investor` |
  | `talent` | `other` |
  | `attendee` | `other` |
  | empty | empty |

  Production already holds at least one profile (created while testing), so this mapping is applied to real rows.
- `alter table ... rename column headline to job_title`. The column keeps its 120-character check and its
  update grant.
- `add column company_website text` with a check that it is `null` or starts with `http://` or `https://` and is
  at most 200 characters. Add it to the column-level `update` grant for `authenticated`.
- The signup trigger is unaffected (it sets only id, name and avatar).
- Applied to production after merge with `supabase db push`, with the owner's go-ahead. Never edited by hand.

## App

- `src/lib/profile/schema.ts`: new `MEMBER_TYPES`, `job_title` and `company_website` fields, validation and
  length limits.
- `src/lib/copy.ts`: labels and error messages ("What is your job title", "Company website", the option labels).
- `src/app/profile/page.tsx` and `profile-form.tsx`: read, show and save the new fields.
- The first-visit prompt to pick a type keeps working for members whose type is empty.

## Testing

- **Unit:** schema accepts each new type and rejects the old ones; `job_title` at 120 and 121 characters;
  `company_website` empty, valid http and https, a non-http address (e.g. `javascript:`), and 200 vs 201
  characters.
- **Database:** the migration maps old values as in the table; a member can update `job_title` and
  `company_website` on their own row and cannot on someone else's; a logged-out role still cannot read
  profiles.
- **Browser QA (local):** the dropdown shows the six options, saving each field persists after reload, an invalid
  website shows an error and keeps typed values.

## Out of scope

Showing these fields anywhere other than the profile page (member directory is Phase 5), a free-text "other"
description, and any other profile fields.
