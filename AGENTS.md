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
