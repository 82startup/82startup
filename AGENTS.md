<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Unified Summit launch — current authoritative rules

- This repository (`82startup/82startup`) now contains both projects. `public/` is the canonical Summit landing source imported from the current local `summit-2027/dist`, including uncommitted visual updates. `/` serves `public/index.html` through a beforeFiles rewrite; the old `src/app/page.tsx` remains preserved but hidden.
- Preserve the Summit design, event data, Luma ticket destinations, photos, licenses and derived 3D viewer. Historical Summit design rules and source documentation live in `docs/summit/`; their old `dist/` paths now mean `public/`. Do not import nested Git repositories, the independent original map project, private state, caches or hosting identity.
- Community screens (`/events`, `/members`, `/connections`, `/messages`, `/profile`, `/settings`, `/login`, `/admin`, `/speakers`, `/sponsors` and descendants) temporarily redirect to `/` using 307. Keep their source, authentication, APIs, database migrations and tests for later integration. Do not expose their navigation on the Summit. This is a UI launch gate, not a replacement for API/database access control. Existing auth/unsubscribe/API behavior remains available.
- Summit HTML, JavaScript, CSS, images and map routes bypass community session refresh and profile gates, for signed-in and anonymous visitors alike. Never require Supabase configuration for the landing page.
- Update AGENTS.md, README.md and affected logic documentation with rule changes. These instructions supersede conflicting launch, approval, branch and release rules in CLAUDE.md and historical Summit docs.
- Authorized changes finish on the verified remote default branch, committed and pushed directly without a PR or another approval. Preserve history; never force push. GitHub account: randyjlee, verified commit email randyjlee.hj@gmail.com; never use lee.randy@belonghome.com.
- No hosting deployment was requested in this integration. Before any future deployment verify Vercel email randyjlee.hj@gmail.com, push the exact source commit and verify its remote presence. Historical local-only Summit guidance does not prevent this explicitly authorized repository integration and push.

- Footer centering: keep `82 STARTUP WEEK` inside a single intrinsic-width span centered by a full-width grid (`place-items:center`), across all Summit pages and breakpoints. Preserve the current font size, tracking, yellow inset treatment and flush bottom placement. This supersedes text-only flex centering.
- When protected main requires CI before a direct push, use a temporary `integration/**` branch for the exact candidate commit. CI must pass before pushing that same commit to main; do not bypass checks or create a PR. This supersedes main-only push triggers in CI. No database rules are changed by this workflow.

## Latest user steering — local edits only until push is explicitly requested

- Do not push any branch or publish/deploy changes until the user explicitly asks again. This supersedes automatic direct-main completion and the temporary integration-branch push workflow above. A previously pushed validation branch exists; do not advance it or main while this hold is active. Local edits and verification remain authorized.
- Compact the homepage hero height by approximately 10% through reduced vertical padding and title margins, with its Zen Dots title 5% smaller (5.415vw, desktop cap85.5px). Preserve all three equal-size title lines, copy, colors, motion and actions. Desktop padding is 50px/54px and title margins27px/22px; at <=800px padding31px/33px and margins20px/20px. This supersedes earlier hero spacing and title scale only.

## Active workspace and archived source — latest user instruction

- Work exclusively in `/Users/randy/project/82_2027summit/82startup` from now on. The original Summit folder, including its Git history and independent original map source, is archived at `/Users/randy/project/_old/summit-2027`. This supersedes references to an active sibling Summit project. Do not edit or synchronize from the archive unless explicitly requested.
- Keep all changes local. Do not push any branch or deploy until the user explicitly asks again; the existing push hold remains authoritative.

### Additional 15% hero height reduction
The latest user request reduces the current homepage hero by another approximately 15%. Preserve its existing title font size and all content; reduce vertical padding to28px/32px desktop and19px/21px at <=800px, title margins to19px/14px desktop and14px/14px mobile, subtitle margins22px/18px desktop and19px/19px mobile, action top padding4px and top margin18px desktop/19px mobile, and note top margin13px desktop/15px mobile. This supersedes the preceding hero spacing values only. Work exclusively in 82startup; the no-push/no-deployment hold remains active.

### Push explicitly authorized for the completed integration
The user now explicitly authorizes pushing the current integration, footer centering, archived-workspace documentation and compact hero changes using GitHub account randyjlee. This lifts the preceding push hold for this change set. Commit with verified email randyjlee.hj@gmail.com, run required CI on the exact candidate through the temporary integration branch, then push the same commit to verified default branch main without a PR or force push. A hosting deployment is not requested. Work remains exclusively in 82startup.
