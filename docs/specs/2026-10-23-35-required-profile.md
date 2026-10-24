# Required profile after sign-up

Issue #35. After signing up, a member must fill **I am**, **Name**, **What is your job title** and **Company** before using the
site. Until then every page sends them to the profile screen. Changes "only the name is required" of
`2026-10-23-5-profile-fields.md` and `2026-10-23-17-member-directory.md`; their other rules stand.

## Scope

In: four required profile fields; a first-time setup screen; a gate that keeps a signed-in member with an incomplete profile on that
screen; existing members are covered by the same rule.
Out: any other new field, a multi-step wizard, email verification, checking that the job title or company are real, changes to what the
directory or chat show, admin tools to edit someone else's profile.

## Decisions (owner, 2026-10-23, from the screenshot of the profile form)

- Required: **I am** (member type), **Name**, **What is your job title**, **Company or where you are now**. Everything else (company website, bio, LinkedIn, photo,
  "Show me in the member directory") stays optional.
- Asked **first, at sign-up**, and the member **cannot navigate elsewhere** until all four are filled.

## Assumptions to confirm (change any before approving)

1. **The gate covers the whole site for a signed-in member**, including the public pages (home, events). A signed-in member with an
   incomplete profile who opens any page is sent to the setup screen. Visitors who are not signed in are not affected.
2. **Existing members are covered too.** The owner's account (and any other account with empty fields) is sent to the setup screen at
   its next page load.
3. **Sign out stays possible** from the setup screen, so nobody is trapped.
4. **The Company field is relabeled "Company or where you are now"** (a company, a school, an organization, "Independent"), so it fits
   everyone, and it is required. It is the same stored field as today (`company_name`); only its label, hint and error text change, on the
   setup screen, the profile page, the member page ("Company" there becomes "Where") and the directory search hint stays "name or company".
5. **"I am" starts with nothing selected** ("Select…"), so the member makes a choice. Today it starts on "Other".

## What the member sees

- **Sign-up and first login** (email link or Google) end on the setup screen. If the destination was another page, it is remembered and the
  member goes there after saving.
- **The setup screen** (the existing `/profile` page in setup mode): a short line "Tell us about yourself to continue", the four fields first
  in this order: I am, Name, What is your job title, Company or where you are now, each marked required, then the optional ones (website, bio, LinkedIn, photo,
  directory switch) below. A **Save and continue** button. The header shows only the site name and **Sign out**, with no links to other pages.
- **Errors** appear under the field: "Choose what you are", "Enter your name", "Enter your job title", "Enter your company or where you are now". A field
  with only spaces counts as empty. Lengths stay as they are (name 100, job title 120, company 100).
- **Names from Google** are filled in automatically as today, so a Google member usually only has the other three to fill.
- **After saving** the member goes to the page they were trying to reach (or the home page) and the normal header comes back.
- **Later edits:** the same four fields cannot be emptied again on the normal profile page; saving with one empty shows the same errors.

## How the gate works

- **A member is complete** when their member type is chosen and their name, job title and company are not empty after trimming.
- **Where it is checked:** on the server for every page request of a signed-in member (not only in the screens), and again in the server
  actions that save profile data. The only pages and addresses that stay open to an incomplete member are the setup screen itself,
  sign-out, the sign-in return address (`/auth/callback`), the Supabase and cron/webhook API routes (they are not member pages), and static
  files. A direct visit to any other address redirects to the setup screen with the wanted address kept as `next` (only same-site
  paths, using the existing safe-path check).
- **Cost:** one small read of the member's own profile per page request, with a short-lived cookie that remembers "complete" so a member
  who is done is not checked again on every click (the cookie is only an optimisation: it is re-checked when it expires, and it never
  grants access to data, because the database rules do not depend on it).
- **Data is not weakened:** the directory, connections and messages keep their own database rules. This gate is about the screens; a member
  who skipped it by calling the database directly could still only do what they could already do.
- **No new table.** One small database function `profile_is_complete()` (security definer, explicit grant to `authenticated` only) used by
  the gate, and one timestamped migration for it. The existing profile update rules and grants stay.

## Testing (tests first)

- **Unit, the rule:** complete / incomplete for each missing field, spaces-only, over-length, member type missing or invalid.
- **Unit, the form:** each missing field gives its own error; all four present saves; optional fields stay optional; a member type not in the list is refused.
- **Unit, the gate:** an incomplete signed-in member is redirected from a member page, from the home page and from an event page, with `next` kept
  and only for same-site paths (`//evil.example` and `https://evil.example` fall back to the home page); the open addresses (setup screen, sign-out,
  callback, API routes, static files) are not redirected; a complete member and a visitor pass through; the cookie shortcut is honoured only when it
  matches the signed-in member and has not expired.
- **Database:** `profile_is_complete()` for each case, for the caller only; no execute for anon; production-like grant check.
- **Browser QA (local):** a new email sign-up lands on the setup screen with the header reduced to Sign out; trying `/events`, `/members`,
  `/messages` redirects back; each empty field shows its error; saving sends to the remembered page; the normal header returns; an old account with empty
  fields is caught; a Google-style account with only a name filled; 375px width.
- **Live:** after release, the owner's account (or a test account) is walked through it once.

## Release

Migration first (`supabase db push --linked`), then merge, verify on production. Existing members with empty fields will be asked on their next visit.
