# Member connections: request, accept, decline, block

Issue #28. Second of four threads (profile events #27 → connections #28 → chat #29 → posts as messages #30). A connection
exists only when **both** members agree. Chat (#29) and posts as messages (#30) work only between connected members.

## Scope

In: sending a connection request with a short note, accepting or declining it, cancelling a sent request, disconnecting,
blocking and unblocking; a **Connections** page; a connect button and its state on each member profile; the number of
waiting requests in the header.
Out: email or phone notifications, suggestions of people to connect with, importing LinkedIn connections, groups, admin
tools to read or change connections (admins have no special access to who is connected to whom), chat (#29), posts (#30).

## Decisions (owner, 2026-10-23)

- A connection is made by a request that the other member **accepts**; both sides then see each other as connected.
- A request can carry a **short note** (up to 200 characters), for example "I'd like to meet at Summit".
- A request can be **declined or cancelled**, and a connection can be **ended** by either side.
- A member can **block** another member.
- Requests can be sent **only to members who are listed in the directory**.

## Rules

- One relationship per pair of members, in either direction. If B already sent A a request, A pressing Connect on B accepts
  B's request instead of making a second one.
- You cannot connect with yourself, with someone who is not listed in the directory, with someone you blocked, or with
  someone who blocked you. The last case looks the same as "not available" so a block is not revealed.
- **Declined**: the requester is told "declined" nowhere; they simply see the request as no longer pending. They cannot send
  another request to that member for 30 days. The decliner can still send their own request at any time.
- **Cancel** (by the sender) and **Disconnect** (by either side) delete the relationship. After a disconnect either side may
  send a new request later.
- **Block** ends any connection or pending request with that member and stops new requests and messages from them. The blocked
  member is not told. Unblock removes the block only; nothing is restored.
- A member who leaves the directory keeps existing connections and pending requests but receives no new requests.
- Deleting an account deletes its relationships and blocks (foreign keys delete with the profile).

## What a member sees

- **On a member's profile:** one button that depends on the state: **Connect** (opens a small box for the note), **Request
  sent** with **Cancel**, **Accept** and **Decline** (with the note shown), **Connected** with **Disconnect**, and a
  **Block** link. On your own profile nothing is shown.
- **`/connections`:** four lists: requests received (with the note), requests sent, connections, and blocked members, each
  row showing photo, name, job title, company and a link to the profile.
- **Header:** a **Connections** link, with the number of requests waiting for you when it is above zero.

## Database

Two new tables, both closed (no direct read or write for anyone; everything goes through functions, security definer, set
search_path empty, execute granted to `authenticated` only, with explicit grants because production grants nothing
automatically):
- **`connections`**: `id`, `requester_id`, `addressee_id` (both → `profiles`, delete cascade), `status` (`pending` |
  `accepted` | `declined`), `note` (text, up to 200 characters, check constraint), `created_at`, `responded_at`. A unique index on
  the unordered pair guarantees one row per pair; a check forbids connecting with yourself.
- **`member_blocks`**: `blocker_id`, `blocked_id` (both → `profiles`, delete cascade), `created_at`; unique pair.

Functions: `send_connection_request(addressee, note)`, `respond_connection_request(id, accept)`,
`cancel_connection_request(id)`, `remove_connection(member)`, `block_member(member)`, `unblock_member(member)`,
`connection_state(member)` (none, sent, received, connected, unavailable), `my_connection_lists()`, `pending_request_count()`.
Chat (#29) will use a helper `are_connected(a, b)` defined here.

## Testing (tests first)

- **Database:** each rule above: request needs a listed addressee, no self, no duplicate in either direction, mutual request
  becomes a connection, only the addressee can respond, only the sender can cancel, decline then a second request within 30 days
  is refused and after 30 days allowed, block removes the relation and hides the profile state as "unavailable" both ways, a
  blocked member cannot request, note over 200 characters refused, anon and other members cannot read the tables, counts, a
  production-like check with default grants revoked.
- **Unit:** the profile button for each state; note length; header count.
- **Browser QA (local, two accounts via Mailpit):** send with a note, accept, connected on both sides, disconnect, decline,
  cancel, block; 375px width.
- **Live:** with two real accounts after release.

## Release

Migration first (`supabase db push --linked`), then merge, verify on production.
