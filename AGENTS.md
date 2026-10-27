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

## Social sharing, performance and release — current authorized behavior

- The user authorized applying the chosen Zen Dots OG image, whole-site performance optimization, commit/push and production deployment. This supersedes prior no-deployment/no-push restrictions for this change set. Verify GitHub randyjlee and Vercel randyjlee.hj@gmail.com; push and verify the exact remote main commit before deploying that source. The existing production project is 82-startup/82startup at https://82startup.vercel.app; do not create a replacement project or use another account if team access is missing.
- All five public documents include static Open Graph and Twitter summary_large_image metadata pointing to the selected image at /assets/og-startup-week-2027-zen-dots.jpg (1200x630). Retain PNG masters. The canonical production origin is https://82startup.vercel.app; update scripts/build-landing.mjs if its authorized domain changes.
- scripts/build-landing.mjs is the shared prerender/metadata generator, invoked by npm run build and npm run dev. Edit visible landing content in public/app.js and metadata descriptions in public/*.html; regenerate with npm run build:landing. It reuses the client templates, preserves pre-rendered DOM and skips duplicate DOM replacement. Keep the hero immediately visible instead of animating its initial opacity from zero. Lower-page reveal motion remains.
- Load the Google font stylesheet directly from HTML in parallel with local CSS rather than a blocking CSS @import. Keep Zen Dots and Noto Sans KR/IBM Plex Sans typography. Non-home pages omit hero, photo and hidden-sponsor scripts. Static assets use a one-day browser cache with stale revalidation; document freshness is unchanged.
- Preserve the glyph/ember aesthetic while bounding its grid to roughly 4,000 cells, limiting animation to24fps and warmup to16 simulation steps, caching radial distance/noise calculations, and pausing while offscreen/hidden or reduced-motion is requested. Existing motion, interactions and colors remain.
- The derived map is a hosted multi-file viewer now: Three.js r128 is in public/venue-map/vendor with its license, scanned plans are external WebP files fetched only when used. This supersedes historical self-contained/offline/no-network rules for this derived public viewer only; do not edit the archived original. Venue preview starts when near the viewport; the full map still loads on demand. Map cache version19. Artwork uses visually equivalent WebP variants; preserve source PNGs.
- Latest date-only correction: the homepage announcement, hero eyebrow, WHEN date and home metadata say March15–21, 2027. Other pages and all individual event facts/ticket links stay March16–19 as previously authorized. This explicitly supersedes the prior homepage date only; it does not create additional events.

### Git-only automatic deployment — latest release instruction
The user now explicitly requests Git push only: Vercel already deploys automatically from the connected repository. This supersedes manual Vercel deployment and team-access authorization steps for this release. Run CI, push the exact tested commit to verified remote main as randyjlee, and verify the public rollout/commit status read-only. Do not start Vercel CLI login or manually deploy/promote/create projects. No additional Vercel approval is required for the already-configured Git integration.

## Luma Expo synchronization — October 26, 2026

The official calendar now includes 82 Startup Expo 2027 (https://luma.com/ro8918x0), March 17 10:00 through March 18 18:00 PDT, Fort Mason Center · Gateway Pavilion, 2 Marina Blvd, San Francisco CA 94109. Admission is free with registration required. Use the published header bounds despite the body’s Time TBD; do not imply overnight sessions. Preserve the separately supplied March 19 VIP event. There are six events total. The homepage displays all six in chronological order in one grid: three columns and two rows on desktop, two columns on tablet, one on mobile. This supersedes the four-card layout and separate full-width VIP feature. Schedule and tickets use the same shared event source; show Expo on both days, its free registration action and official link. Keep counts and metadata at six; the homepage date range remains March 15–21.

## Active local-only hold — October 26, 2026

The user explicitly said not to push because more edits are coming. Keep this Expo/grid change set and subsequent edits local; do not commit, push any branch, or deploy until the user explicitly requests it again. This supersedes automatic default-branch delivery, validation-branch pushes and release authorization above for current work.

## Mobile spacing and title — October 26, 2026

At widths <=800px, use fixed 10px outer wrap gutters and matching 10px page rails, superseding the prior 6vw (approximately 23px) mobile gutters. Retain the existing inner section padding. Enlarge the homepage hero title from 5.415vw to 6.2vw, preserving all three equal-size lines and existing typography/motion. Desktop layout is unchanged. Keep changes local under the active no-commit/no-push/no-deploy hold.

### Mobile hero primary button
At <=800px, the homepage hero Get your tickets button fills 100% of the hero action content width, with label and arrow spaced apart. Preserve the secondary link and desktop behavior. This supersedes the prior intrinsic-width mobile primary button. Keep changes local; no commit, push or deployment.

## Homepage event timeline — latest layout

Replace the six-card 3-column/2-row homepage layout with one chronological vertical timeline. Preserve all six existing gradient/grain artworks and titles, event facts and individual registration links. Desktop rows contain a connected date rail, artwork and details; mobile rows keep the date rail beside stacked artwork/details. This explicitly supersedes the previous homepage grid and separate VIP feature. Use program-timeline rather than program-cards so the old full-row card overlay does not cross timeline content. Keep the 10px mobile outer gutters, larger hero title, full-width mobile hero button and local-only hold.

### Simplified event timeline actions
Keep the timeline and existing artwork, with more compact rows (220px desktop artwork, 190px mobile) and lighter description text. Place event registration and View program in two equal columns on desktop and mobile, using compact 44px outline actions instead of the stacked full-width dark button and text link. This supersedes the earlier timeline button layout only; the mobile hero primary button remains full width. Keep all current work local without committing, pushing or deploying.

### Smaller timeline artwork and black tickets
Reduce homepage timeline artwork to 170px high on desktop and 145px on mobile, with a narrower desktop artwork column and proportionately smaller artwork labels/titles. Keep the two equal action columns. Registration/ticket actions use the established black background (#24251f) and yellow label/arrow; View program remains outlined. This supersedes the preceding 220px/190px artwork and outlined registration action. All changes remain local under the active no-commit/no-push/no-deploy hold.

### Timeline image height alignment
On desktop (>800px), stretch each timeline artwork to match its adjacent description/facts/buttons column, with a 170px minimum height. Keep the reduced artwork column width, mobile 145px artwork, black ticket actions and two-column buttons. This supersedes the fixed desktop 170px artwork height. Keep all changes local.

### Compact buttons and two-line event summaries
Homepage timeline descriptions show at most two lines with an ellipsis on overflow; full event summaries remain available in Schedule/Tickets. Keep complete descriptions in the DOM. Timeline actions stay in two equal columns but are 36px tall, centered, with smaller arrows and a 420px maximum group width. Ticket registration stays black/yellow; View program is a plain action without a visible border. This supersedes the preceding 44px full-column-width outlined actions. Preserve desktop image/detail height alignment and the local-only hold.

### Full descriptions and right-aligned buttons — latest instruction
Show the complete homepage event descriptions without line clamping, truncation or ellipses. This explicitly supersedes the preceding two-line limit. Align the compact two-column button group to the right of its details column using auto left margin, retaining its 420px maximum width, 36px height and black ticket action. Keep artwork height aligned to full details on desktop. All work remains local.

### Timeline dot alignment
Anchor every date marker to the same --timeline-rail coordinate as the vertical line (124px desktop, 104px tablet, 67px mobile), centered on the 1px stroke with translateX(-50%). Position markers relative to each full timeline row rather than the date text width. This supersedes the previous right-offset dot placement, which drifted as row gaps changed. Keep all changes local.

### Wider complete timeline descriptions
Remove the inherited 310px paragraph max-width from homepage timeline descriptions; use the entire details column so desktop summaries wrap to approximately two lines without hiding any text. Natural wrapping remains responsive; no fixed line limit or truncation. This supersedes the legacy card paragraph width. Preserve right-aligned compact buttons and local-only work.

### Artwork export clarification
The square bottom-title-only artwork request is for six standalone image files, not a website layout change. Preserve the preceding website layout and export the artwork separately outside the repository. Keep the no-commit/no-push/no-deploy hold.

### Clean 3D map floors — remove scanned annotations
All 3D building floors now use the existing solid off-white material without scanned floor-plan textures. This removes upside-down room names, dimensions and other baked-in annotations across buildings/floors/layouts. Preserve modeled walls, doors, stairs, furnishings, booth labels and intentional navigation signage; original reference drawings remain available in the gallery. This supersedes the previous textured 3D floor behavior only. Viewer cache version is 20. Keep changes local without commit, push or deployment.

### English 3D map tags
All built-in 3D scene tags and selectable object names use English, including registration, stage/screen, seating, tech team, curtain, reception, buffet, queue, VIP lounge, startup booths, meeting rooms, food court/stalls, doors and banners. Preserve category colors and pill styling by matching English labels. Do not rewrite user-authored notes or source drawing images. Viewer cache version is 21. Keep changes local.

## Release authorized — October 26, 2026

The user explicitly requested push and deployment of the current Expo, mobile layout, event timeline and 3D map changes. This lifts all preceding local-only/no-commit/no-push/no-deploy holds for this change set. Verify GitHub randyjlee and its verified email, run required checks on the exact integration candidate, then push the same commit to verified default branch main without a PR or force push. Use the existing Vercel Git integration for automatic production deployment; do not manually deploy or change accounts/projects. Verify remote commit and production rollout read-only. Exported artwork remains outside the repository and is not part of this website release.
