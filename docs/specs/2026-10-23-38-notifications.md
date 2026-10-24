# Email notifications for connections and messages, with notification settings

Issue #38. Members can **opt in** to an email when someone asks to connect, when their request is accepted, and when they receive a
message or a post. Each member ticks the emails they want in **Settings**; nobody gets any email until they tick it. Builds on
connections (#28), chat (#29), posts (#30) and the Settings page (#39).

## Scope

In: four kinds of email; opt-in checkboxes in the **Notifications** section of **Settings** (the page from #39); a reliable way to send
them after the action that caused them; a limit so a busy conversation does not flood an inbox.
Out: an in-app notification list or bell (the header numbers stay as they are), push or SMS notifications, a daily digest, marketing or
event-reminder emails, reply-by-email, notifications to anyone who is not a member, admin tools to read or send notifications.

## Decisions (owner, 2026-10-23)

- Send an email when someone **requests** to connect, when someone **accepts**, and when someone **sends a message**.
- It is **opt-in**: in Settings, Notifications, each member ticks a **checkbox for each email** they want to receive. Unticked means no email.
- **Every email says which emails the member gets and which they do not**, and has an **Unsubscribe** link so they can manage it themselves, without signing in.
- A message email is sent **at most once per hour** per conversation (not every 30 minutes).

## The four emails

| Kind | Sent to | When | Setting name |
|---|---|---|---|
| Connection request | the member asked | someone sends them a request (with the note, if any) | Connection requests |
| Connection accepted | the member who asked | the other member accepts | Accepted connections |
| New message | the recipient | someone sends them a chat message | Messages |
| New post | the recipient | a connection's post is delivered to them (#30) | Posts from my connections |

- All four checkboxes are **off by default**, for existing and new members: **nobody receives any email until they tick it.** A member who has never opened
  Settings has no saved row and gets no email.
- **Declined requests, cancelled requests, disconnects and blocks send nothing.**
- **Throttle for messages:** at most one **New message** email per conversation (the same sender to the same recipient) in any **60 minutes**. The first message after a
  quiet period sends the email; messages that follow within the hour are not emailed one by one. (The header number still counts every one.)
  Posts are one email per post; at most 5 posts a day per author (#30) already limits them.
- A kind that the member has not ticked is never sent, even if it was waiting. If they tick it later, only new events after that are emailed (nothing old is sent).
- A notification older than 24 hours when it is finally processed is dropped (it would only confuse).
- Nothing is sent about your own actions, or to a member who has since deleted their account.

## What an email looks like

- **From** `82 Startup <notifications@send.82startups.com>` (the domain already verified in Resend for sign-in emails).
- **Subject** names the person: "Bo B wants to connect on 82 Startup", "Bo B accepted your connection request", "New message from Bo B",
  "Bo B shared a post".
- **Body**, plain and short: who it is from (name, job title, company), a **preview of the note, message or post, cut at 200 characters** (assumption 1),
  and a button/link to the page (the member's profile for requests and acceptances, the conversation for messages and posts).
- **Footer, in every email** (so the member always knows what they get and can change it):
  1. "You get this email because you chose to be emailed about: **connection requests**." (the kind of this email)
  2. "Your email settings:" followed by all four kinds, each marked **On** or **Off** for this member (Connection requests, Accepted connections, Messages, Posts from my connections).
  3. **Unsubscribe from these emails** (this kind only) and **Unsubscribe from all emails** (all four), and **Manage email settings** (opens Settings; asks to sign in).
- The email shows names and text exactly as written, as plain text; nothing from a message is ever turned into markup or a clickable link. Only our own links (to the site and
  to unsubscribe) are links.
- Mail programs get the standard **List-Unsubscribe** headers (including one-click) so their own "Unsubscribe" button works too.

## Unsubscribe links (no sign-in needed)

- Each member has a private, unguessable **unsubscribe code** (random, 256 bits), created the first time an email is sent to them and stored with their notification settings,
  readable only by the server. The code is in the unsubscribe links of their emails; it identifies the member, never reveals who they are, and can only ever **turn emails off**,
  never on and never change anything else.
- Opening an unsubscribe link (`/unsubscribe?code=…&kind=…`) shows a small page: "Stop emails about **messages**?" with a **Unsubscribe** button (and "Unsubscribe from all emails",
  and "Manage email settings"). **Opening the link alone changes nothing**: only pressing the button does (so mail scanners that open links cannot unsubscribe anyone by accident).
  After pressing, the page says what was turned off and that the member can turn it on again in Settings.
- The mail program's one-click unsubscribe (List-Unsubscribe-Post) turns off the kind of that email in one request, without a page.
- A wrong, old or reused code shows the same neutral message ("This link is not valid") and changes nothing.
- Settings and the unsubscribe page always agree: unsubscribing unticks the checkbox; ticking it again in Settings turns the emails back on.

## Notification settings (in Settings)

- The **Notifications** section of `/settings` (the page from #39) shows "Email me when…" and four **checkboxes**, all unticked at first, each with a short explanation:
  **Someone wants to connect with me**, **Someone accepts my connection request**, **I receive a message**, **A connection shares a post**. A **Save** button saves them and a
  "Saved" message appears. The "where you see notifications" list from #39 is replaced by this section (the header numbers still show requests and messages).
- Stored as one row per member in a new table (below). Saving changes only the signed-in member's own row. Signed-out visitors are sent to sign in and back.

## How it works (so no email is lost and none is sent twice)

- A new table **`notification_events`** is a to-send list (an outbox). The same database step that records a request, an acceptance, a message or a
  post also adds one row for the recipient, in the same transaction, so a notification exists exactly when the action happened. Each row: recipient,
  kind, who caused it, which connection/message/post, when, and a status (`pending`, `sent`, `skipped`, `failed`) with the number of tries.
- A server job reads the pending rows, drops the ones that are off in the recipient's settings, too old, throttled or whose recipient no longer exists,
  looks up the recipient's email address **at that moment** and sends it, then marks the row. **Email addresses are never copied into our tables.**
- The job runs **right after the action** (in the background, so the member does not wait) and also **every 5 minutes** as a safety net for anything
  that failed or was missed. A row that fails is tried again at the next run, up to 3 tries, then marked failed (no more tries).
- Each row is claimed before sending (so two runs at once cannot both send it) and is sent at most once.
- The mail provider is **Resend** over its web API, using a new server-only secret `RESEND_API_KEY` (never in code, chat or commits). The code talks to a small mail
  sender interface; tests use a fake one, and local development uses a "log" sender that prints the email instead of sending it (no key needed).
  If `RESEND_API_KEY` is not set in production, nothing is sent and rows wait; the site keeps working.
- The 5-minute run is protected by the existing `CRON_SECRET`, like the Luma sync.

## Database (one migration, explicit grants for production)

- **`notification_preferences`**: `member_id` (primary key, → `profiles`, delete cascade), one boolean per kind (all **default false**, opt-in), `unsubscribe_code` (random, unique,
  created when first needed), `updated_at`. Closed table; read and
  written through functions only.
- **`notification_events`**: the outbox above. Closed table. Only the server job (service role) can read or change it; members cannot read it.
- Functions: `my_notification_preferences()` (with defaults when no row), `set_notification_preferences(...)` for the caller, and the existing
  `send_connection_request`, `respond_connection_request`, `deliver_message` get one extra step that adds the outbox row. For the job (service role only): `claim_notification_events(limit)`
  (marks a batch as being worked on and returns what the job needs, never an email address), `finish_notification_event(id, status)`, `ensure_unsubscribe_code(member)`.
  For the unsubscribe page and one-click request (service role only, called by the server after it checks the request): `unsubscribe_with_code(code, kind)` which only turns a kind (or all) off.
- All new functions: `security definer`, `set search_path = ''`, execute granted only to the role that needs it, revoked from everyone else.

## Testing (tests first)

- **Database:** each action adds exactly one outbox row for the right recipient and kind (and none for a decline, cancel, block, mutual-request accept shortcut counts as an accept);
  preferences default to all off, save only for the caller, and are unreadable by others; members cannot read the outbox; claiming a row twice gives it once; the 60-minute message
  throttle; a deleted account's rows disappear; production-like grant check.
- **Unit, the job:** a pending row is sent when the kind is ticked; skipped when not; nothing sent for events from before the member ticked it; skipped when older than 24 hours; throttled; retried then failed after 3 tries; never sent twice
  under a second concurrent run; no email address in any stored value; a missing key sends nothing and leaves rows pending.
- **Unit, the email text:** subject and body for each kind, the 200-character preview, a long or markup-filled message stays plain text; the footer lists all four kinds with the right On/Off for the recipient,
  names the kind of this email, and has the unsubscribe-this-kind, unsubscribe-all and manage links; the List-Unsubscribe headers.
- **Unit and database, unsubscribe:** opening the link (GET) changes nothing; pressing the button (POST) turns off the right kind, or all; one-click POST works; a wrong, empty or malformed code changes nothing and
  gives the neutral message; a code can only turn things off (never on); the code never appears in logs or in any other member's data; two members' codes differ; a code reaches only its own member.
- **Unit, the settings section and action:** logged-out is sent to sign in; saving changes only the caller; each checkbox round-trips; all start unticked.
- **Local end to end:** with the log sender, doing each action prints the right email once (footer included); opening its unsubscribe link and pressing the button unticks the checkbox in Settings; unticking a kind stops it; a burst of messages sends one; with nothing ticked nothing is sent.
- **Live (after release):** with real accounts, with nothing ticked no email arrives; after ticking, each of the four emails arrives once in an inbox, and unticking one stops it.

## Release

1. Migration (`supabase db push --linked`), then merge.
2. The owner adds `RESEND_API_KEY` (Sensitive) to Vercel Production and redeploys (from the Resend dashboard, an API key with **sending access** for the `send.82startups.com` domain; never pasted in chat).
3. Verify on production with two accounts.
Until the key exists, no email is sent and members see no difference.

## Assumptions to confirm (change any before approving)

1. **Emails include a preview (first 200 characters) of the note, message or post.** Alternative: no text, only "Bo B sent you a message" and a link (more private).
2. **Message emails are throttled to one per conversation per 60 minutes** (your choice).
3. **Posts have their own setting** (they are not under "Messages"), since one post can reach many people.
4. **No in-app notification list** in this version (the header numbers remain).
5. **Resend's plan:** the free plan allows 100 emails a day. If this is exceeded, emails wait and are sent as allowed; check the plan before many members join.
