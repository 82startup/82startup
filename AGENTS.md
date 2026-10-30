<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Unified Summit launch — current authoritative rules

- This repository (`82startup/82startup`) now contains both projects. `public/` is the canonical Summit landing source imported from the current local `summit-2027/dist`, including uncommitted visual updates. `/` serves `public/index.html` through a beforeFiles rewrite; the old `src/app/page.tsx` remains preserved but hidden.
- Preserve the Summit design, event data, Luma ticket destinations, photos, licenses and derived 3D viewer. Historical Summit design rules and source documentation live in `docs/summit/`; their old `dist/` paths now mean `public/`. Do not import nested Git repositories, the independent original map project, private state, caches or hosting identity.
- Community routes are active: the Summit header's top-right `Join Community` button opens a Summit-themed sign-in modal backed by `/login?next=%2Fmembers&modal=1`. Match the Summit palette (yellow `#f0fa4b`, paper `#f6f5ed`, charcoal `#24251f`), square button/border treatment, compact uppercase labels, and IBM Plex Sans/Noto Sans KR typography. Community pages use this typography and palette with left-side navigation and no extra Summit/community overline above the page content; the sidebar logo reads `82 STARTUP WEEK` over `COMMUNITY`, and the brand symbol and browser favicon reuse the Summit landing page's `public/assets/82startup-symbol.svg`. `/members` is the default post-login and community entry page, `/member` aliases to `/members`, and `/events` redirects to `/members` without rendering an event list. The members directory uses a three-column desktop grid, responsive narrower layouts, compact search/type filters with a custom Summit-style select indicator, and right-aligned member-type tags. Opening a member from the directory intercepts `/members/[id]` into a clean modal over the list; direct detail URLs still render the profile page, and modal history/back closes the profile. Company and LinkedIn links use compact icon-only controls with accessible names; LinkedIn uses its recognizable brand mark, and connection actions are aligned together. Show the sidebar Admin link only when the signed-in user passes Supabase `is_admin`. Keep `http://localhost:3000/auth/callback?next=*`, `http://127.0.0.1:3000/auth/callback?next=*`, and `https://82startup.vercel.app/auth/callback?next=*` in the Supabase Redirect URLs allow-list (the production project currently has the broader production wildcard; local callback URLs still need adding). Resolve browser-facing host from trusted forwarded/host headers so OAuth callback host matches the host that owns the PKCE cookies. The Google button starts top-level OAuth through `/auth/google`, and successful sign-in returns to `/members`. Community route requests use existing Supabase session refresh and page-level authorization. The former redirect-to-home launch gate is retired; this supersedes the earlier temporary gate rule. Summit public HTML/assets continue to bypass Supabase and must work without Supabase configuration.
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

## Original community local preview
`npm run dev:community` opens the preserved original community on http://127.0.0.1:3001 with separate .next-community output. Only when NODE_ENV=development and COMMUNITY_LOCAL_PREVIEW=1, disable the Summit home rewrite and launch redirect; retain normal community session/profile checks. Production and normal npm run dev remain Summit-first. The preview requires a configured Supabase URL and publishable key; do not invent data or bypass access control. The user requested local preview only; do not commit, push or deploy these new changes unless explicitly requested.

### Header animation contrast
Increase the homepage hero animated glyph and floating ember opacity by 15% (multiply existing glyph alpha and ember opacity by 1.15). Preserve motion, timing, colors, layout and reduced-motion behavior. This is a local-only adjustment; do not commit, push or deploy unless explicitly requested.

## Homepage speakers and sponsor sections
Add static homepage sections after the event timeline and before the photo gallery, matching existing Summit paper/grid styling. Speakers follow the user screenshot: 김정상 (Professor · IONQ), Edward Kim (Co-founder · Gusto), Cal Henderson (Co-founder · Slack), Eric Kim (Co-founder · Good Water Capital). User-supplied names/roles are retained as supplied. Four desktop columns, two mobile columns. Sponsors are exclusively Naver (Platinum), Altos Ventures and 한국벤처기업협회 (Gold), as clarified by the user; speaker employers are not sponsors. Preserve the screenshot's Featured Sponsors 2026 heading so these are not silently presented as confirmed 2027 sponsorship. Use text wordmarks, not invented official logo images. Keep the unrelated illustrative tech-logo strip hidden. No Supabase dependency for these static sections. These local changes are not authorized for push/deployment yet.

### Face-focused speaker portraits
Frame homepage speaker photos as close-up headshots inside their existing square cards, using CSS object positioning and individual scale/origin adjustments. Keep original image files, full names, roles and the first speaker's missing-photo placeholder unchanged. Preserve responsive layout. This supersedes upper-body portrait framing. Keep changes local; do not commit, push or deploy.

### IONQ speaker photo supplied by user
Replace the IONQ speaker placeholder with public/assets/speakers/ionq-speaker.jpg, downloaded from the exact user-provided image URL. Retain the supplied display name and role and face-focused framing. This supersedes the missing-photo placeholder instruction. Keep changes local without commit/push/deployment.

### IONQ speaker name correction
The correct IONQ speaker name is 김정상, explicitly corrected by the user. This supersedes the earlier screenshot name. Keep the user-supplied portrait and existing role. Changes remain local.

### Consistent speaker portrait placement
Use individually positioned source images in the square portrait frames to align eye-lines around 35% of frame height, with consistent headroom and comparable face scale. This supersedes the earlier transform/origin close-up rules. Preserve original image files and speaker details. Keep all changes local without commit, push or deployment.

### Black-and-white speaker photos
Display all homepage speaker portraits in grayscale using CSS, preserving original source files and aligned face framing. Keep changes local without commit, push or deployment.

### Edward Kim portrait replacement
Use the exact user-selected TechCrunch image (https://techcrunch.com/wp-content/uploads/2024/10/edward-kim.jpg), saved as public/assets/speakers/edward-kim-techcrunch.jpg, instead of the earlier red-sweater photo. Frame it to the shared portrait eye-line and preserve grayscale. This supersedes the earlier Edward photo source/framing only. Keep changes local.

### Black vector sponsor logos
Replace the three sponsor text approximations with local SVG artwork: NAVER logotype from Wikimedia (sourced to NAVER), ALTOS paths from the official altos.vc inline logo, and KOVA vector paths extracted from the official 2024 brochure. All visible logo ink is black, preserving white negative spaces and original path geometry. No embedded raster images or font-dependent recreated logos. Preserve sponsor tiers/names, 2026 heading and responsive layout. This supersedes the earlier text-wordmark rule. Source records are in docs/summit/ASSETS.md. Keep changes local without commit/push/deployment.

### Sponsor website links removed
Sponsor cards are informational only: remove the NAVER website link and Visit website action; do not make any sponsor card/logo a link. Center the Platinum logo. This supersedes the previous NAVER outbound sponsor action. Keep changes local without commit/push/deployment.

### Center NAVER sponsor logo
Use a full-width grid with place-items:center on the Platinum sponsor card and auto logo margins so NAVER is centered horizontally and vertically at every breakpoint. This supersedes preceding flex justification for this card. Keep changes local.

### Edward portrait scale correction
Enlarge the user-selected Edward Kim portrait from 320% to 385% source width, with left -152% and top -26%, to bring face scale closer to the other portraits while maintaining the shared eye-line. This supersedes the previous TechCrunch image framing. Preserve grayscale and keep changes local.

### Sponsor inquiry action
Below the sponsor cards, show Interested in sponsoring? with a black Reach out button linking exactly to mailto:gkim@sazze.vc. This is the user-authorized contact action; sponsor company website links remain removed. Stack the heading and action on mobile. Keep changes local without commit, push or deployment.

### Speakers page synchronized with homepage
The standalone /speakers.html page now renders the same shared four-person lineup as the homepage, including current source photos, corrected 김정상 name, grayscale treatment and individual face positioning. Remove the former lineup-coming-soon artwork and notices. Keep speaker data/markup shared to prevent divergence. Metadata describes the actual lineup. This supersedes historical speaker-placeholder rules. Keep changes local without commit/push/deployment.

### Larger 김정상 portrait
Increase the IONQ portrait source width from 220% to 253% (15% relative enlargement), adjusting left to -71% and top to -7.5% to retain the face center and eye-line. Apply through the shared portrait CSS on the homepage and Speakers page; preserve grayscale. This supersedes the earlier IONQ framing. Keep changes local.

### Altos horizontal lockup
Use the user-selected horizontal Altos logo form: white ALTOS lettering in a black square, with black VENTURES lettering to its right. Local assets/sponsor-logos/altos-lockup.svg reuses the official ALTOS letter paths and outlines the accompanying VENTURES word; transparent surroundings, no embedded raster or font dependencies. This supersedes the previous standalone ALTOS wordmark. Preserve no-link sponsor behavior and keep changes local.

### Remove duplicate KOVA caption
Remove the separate 한국벤처기업협회 caption below the KOVA sponsor SVG, since the association name is already part of its logo. Preserve the logo and accessible alt text. Keep changes local.

### Remove duplicate Altos caption
Remove the separate Altos Ventures caption below its horizontal sponsor logo, matching the KOVA caption removal. Retain the SVG lockup and accessible alt text. This supersedes the earlier separate company-name caption. Keep changes local without commit, push or deployment.

### Reopen sponsor logo loop
Reopen the homepage rolling strip directly below the hero using only the current black SVG marks for NAVER, Altos Ventures and KOVA. Repeat three sponsor cycles in each of two identical track groups to fill wide viewports and create a seamless infinite loop. Expose company names once to assistive technology; hide duplicated marks. Restore company-logos.js on the homepage in the prerender generator; retain pause/play, hover/focus pause, offscreen/tab/modal pause and reduced-motion behavior. This supersedes the hidden-strip and illustrative-tech-company content rules. Preserve the lower sponsor section and keep changes local without commit/push/deployment.

### Sponsor rolling strip on all public Summit pages
Render the same NAVER/Altos/KOVA infinite loop once on each of Overview, Schedule, Speakers, Venue and Tickets. Homepage keeps its post-hero placement; inner pages place it immediately after their page heading. Include company-logos.js on all five documents so pause controls, visibility handling and reduced motion remain functional. This supersedes homepage-only logo-strip rendering and script loading. Do not add the strip inside the standalone 3D viewer or the separately preserved community preview. Keep all changes local without commit/push/deployment.

### Smaller rolling sponsor logos
Reduce the rolling-strip logo image boxes by 20% on all public pages: desktop 200×72px to 160×57.6px; mobile 162×60px to 129.6×48px. Preserve strip height, item spacing, repeat continuity and controls. Lower sponsor cards are unchanged. This supersedes the preceding rolling logo sizes. Keep changes local without commit/push/deployment.

### Slower sponsor logo loop
Reduce rolling sponsor speed by 40% relative to the previous 36-second cycle: use a 60-second cycle (60% of previous velocity). Preserve seamless repetition, pause controls and reduced-motion behavior across all five public pages. This supersedes the previous 36-second duration. Keep changes local without commit/push/deployment.

### Additional 30% rolling logo reduction
Reduce rolling sponsor images by another 30% from the current sizes: desktop 112×40.32px and mobile 90.72×33.6px. This supersedes the previous 160×57.6px and 129.6×48px sizes. Preserve the 60-second cycle, strip spacing and lower sponsor cards. Keep changes local without commit/push/deployment.

### Balance rolling logo proportions
Preserve each SVG intrinsic aspect ratio with auto height and individually balanced widths: desktop NAVER 112px, Altos 108px, KOVA 162px; mobile 91px, 88px, 132px respectively. KOVA is wider to keep its fine lettering readable; the square Altos lockup is narrower to avoid dominating by height. Compact items to 210px/170px and strip height to 88px/76px desktop/mobile. This supersedes uniform logo image boxes and earlier strip/item dimensions. Preserve the 60-second seamless loop. Keep changes local.

### Remove rolling logo stop button
Remove the visible play/pause button from the sponsor rolling strip on all five public pages and remove its script dependency. Retain automatic offscreen, hidden-tab, modal and reduced-motion pause behavior plus existing hover/focus pause. This explicitly supersedes the prior visible pause-control requirement. Keep changes local without commit/push/deployment.

## Push and production release authorized — October 26, 2026

The user explicitly requested pushing current main changes and deployment. This supersedes the preceding local-only holds for this change set: speaker/sponsor sections and assets, shared Speakers page, portrait framing/grayscale, header contrast and all-page sponsor rolling strip. Retain the dev-only community preview helper, with .next-community output ignored by Git and ESLint; it must never enable community routes in production. Validate the exact candidate through integration/** CI, then push the same commit to verified default branch main as randyjlee with verified email randyjlee.hj@gmail.com. Use the existing Vercel Git integration and verify rollout read-only; do not manually deploy or create projects. Exclude unused replaced portrait files, private state, credentials and generated caches.

## Supabase local connection
The original community preview uses the user-selected existing production project htqkxezswbduzwgycftx (82startup-production). Its verified API URL and publishable key are stored only in ignored .env.local; never commit that file or credentials. Preserve normal RLS and authentication; do not add service-role keys, change schema or expose the community in production as part of this local connection. Public data reads have been verified. Codex Supabase connector reauthentication is a separate issue; the local application can connect independently. No push/deployment requested for this connection task.

## OAuth callback preserves browser origin
OAuth callback responses use relative 303 Location headers for both success and failure, preserving the actual browser hostname rather than the internal Next.js request origin. This prevents 127.0.0.1 login cookies from being lost after a localhost redirect. Keep safeNextPath validation and normal Supabase PKCE exchange/session protections. This supersedes the previous absolute callback redirects. Keep this fix local until push/deployment is requested.

## Mobile speaker heading alignment

At <=800px, align speaker and sponsor section headings to flex-start so their eyebrow, title and description share the section’s left inset. This supersedes desktop flex-end alignment on mobile only; retain desktop alignment and portrait layout. The user requested this fix and preview locally; do not commit, push or deploy this change set.

## Mobile ASCII and ember readability

At hero widths <=800px, render ASCII glyphs at 8px instead of 12px and floating embers at 8px/7px instead of 14px/12px. Render the mobile ASCII field at 55% of its previous opacity. Reduce mobile ember opacity to the .05–.10 range (before existing fade/pulse and 1.15 multiplier) so rising particles remain subtle behind the copy. This supersedes the previous shared mobile/desktop particle sizing and opacity only; preserve desktop rendering, motion and bounded grid density. Keep this user-requested preview local without commit, push or deployment.

## Mobile hero title enlarged another 10%

At <=800px, increase the homepage hero title from 6.2vw to 6.82vw (10%). Preserve all three equal-size lines and current spacing, typography and motion. This supersedes the previous 6.2vw mobile title size only. Keep the requested preview local without commit, push or deployment.

## Bolder hero title

Thicken all three homepage hero title lines with a .02em currentColor text stroke, preserving the single-weight Zen Dots font, current font sizes, line breaks and motion. This supersedes the previous unstroked hero lettering. Keep this requested preview local without commit, push or deployment.

## More space between mobile hero content blocks

For the latest hero screenshot request, at <=800px use hero vertical padding 25px/29px, title margins 20px/20px, subtitle margins 27px/25px, action top margin 27px and row gap 26px, and note top margin 23px. This supersedes the earlier compact mobile hero spacing only. Preserve title size/weight and desktop spacing. Keep this preview local without commit, push or deployment.

## Additional 10% mobile hero spacing

Increase the preceding mobile hero spacing values by exactly 10%: vertical padding 27.5px/31.9px, title margins 22px/22px, subtitle margins 29.7px/27.5px, action top margin 29.7px and row gap 28.6px, and note top margin 25.3px. These supersede the preceding mobile spacing values only. Preserve typography and desktop layout; keep changes local without commit, push or deployment.

## Mobile refinements release authorized

The user now authorizes committing, pushing and deploying all current intended changes: browser-origin OAuth callback fix and tests, mobile speaker alignment, smaller/subtler ASCII and embers, enlarged/bolder hero title, increased mobile hero spacing, cache-version updates and synchronized documentation. This explicitly lifts the preceding local-only holds for this change set. Verify GitHub randyjlee and verified email randyjlee.hj@gmail.com; validate the exact commit through integration/** CI, push that same commit to verified default branch main, and verify the existing Vercel Git production rollout read-only. Do not manually deploy or change Vercel accounts/projects; keep ignored credentials and local state excluded.

## Signed-in Summit community entry

Signed-in visitors must not be shown the sign-in form again. When a Supabase `sb-*-auth-token` cookie is present, the Summit header button reads `Community` and navigates directly to `/members` instead of opening the sign-in modal; the Summit pages still load no Supabase code. `/login` sends a signed-in member to the validated `next` path, breaking out of the modal iframe to the top window. Server-side session validation on community pages is unchanged. `app.js` cache version is 111. Keep changes local without commit, push or deployment unless requested.

## Community page polish — October 29, 2026

- Member type tags use distinct palettes keyed by `data-type`: Startup yellow/charcoal, Investor charcoal/yellow, Student blue, Corporate violet, Institution green, Other neutral. This supersedes the single yellow tag.
- The member profile modal is 640px wide: avatar, name, `job · company`, then type tag with compact website/LinkedIn icons on one row; plain bio text; Attending as an undivided list (the only divider in the modal body is above the connection footer); footer shows connection status left and the primary action plus a `⋮` More actions menu right. The separate `Where` row is removed.
- Less common connection actions (Disconnect, Block) live in the shared `MoreMenu` (`src/app/connections/more-menu.tsx`) on Connections rows and in the profile modal. Shared `.community-action` (black/yellow), `.community-action-secondary` (outlined) and `.action-quiet` classes replace per-page Tailwind buttons; quiet buttons must not inherit the global black submit style.
- `/messages` stays **Messages**: it lists every accepted connection (those with a conversation first, newest first, then by name) with last message, unread badge or a Message action, each opening `/messages/[id]`. The post-to-connections composer and recent-posts list are hidden but their code (`post-box.tsx`, post actions) is preserved. This supersedes the brief Board rename.
- My profile uses a photo card with a styled Choose photo button and a two-column form (bio full width) collapsing to one column at <=520px.
- The members directory pins the signed-in member first (page 1 of the full directory, or first within any results that include them) with a 2px charcoal outline (inset, so grid edges stay aligned) and `You` badge. The search bar shares the card grid's column lines (6 tracks on desktop: search spans two card columns, Type and Search split the third; 4 tracks at <=1100px); Clear sits on its own line.
- Never use left-edge accent lines (border-left or inset stripes) anywhere in community UI; use borders, tints or badges instead.
- Keep these changes local without commit, push or deployment until requested.
- Opening another page from the intercepted member modal (for example Message) closes the modal: `src/app/@modal/[...catchAll]/page.tsx` returns null so the slot clears on soft navigation.
- My profile fields pair as type/name, company/job title, website/LinkedIn, then About you full width; field hints sit below their input so paired inputs align.
- Settings uses cards with option rows (title and description left, charcoal/yellow switch right) and a Save footer.
- Community UI shows no focus outlines or rings (browser default included), by explicit user request; inputs only darken their border on focus.
- The conversation page (`/messages/[memberId]`) is an unboxed chat layout on the page background (no outer border or panel fill), separated only by header and composer rules: member header linking to their profile with an icon-only refresh, a scrolling thread (my messages charcoal on the right, theirs paper on the left, time below; messages from posts get no POST tag) and a bottom composer with Send. Enter sends, Shift+Enter adds a line, and IME composition (Korean) never sends.
- The sidebar Connections link shows a red count badge of connection requests awaiting the member's answer (`my_connection_lists` kind `received`), refreshed on each community navigation, sign-in change and every 15 seconds while the tab is visible, using the count functions `pending_request_count` and `unread_message_count`. The Messages link shows the same badge for the total unread messages (`my_conversations` unread_count).
- Save results on My profile and Settings appear as a bottom-center toast (`src/components/toast.tsx`, charcoal with yellow check; errors stay 5 seconds) instead of inline notices; field validation errors stay beside their fields.
- The root layout's Suspense fallback is a plain paper screen (`.app-fallback`); never render the legacy SiteHeader/SignupBar there, since it flashed the old design.
- Members can add a KakaoTalk link (`profiles.kakao_url`, migration `20261029120000_profile_kakao.sql`, applied to production 82startup-production on October 29, 2026): https open.kakao.com, qr.kakao.com or pf.kakao.com, at most 200 characters, validated in the form and by a database check. It shows as a KakaoTalk icon beside LinkedIn in the profile modal. Currently hidden by user request: `KAKAO_ENABLED = false` in `src/lib/profile/schema.ts` removes the My profile field and modal icon, and saves leave any stored value untouched; the column and code stay.
- Messages is a two-pane inbox (`src/app/messages/layout.tsx`): connections list on the left (unread conversations first, then other conversations newest first, then connections without messages by name; relative times like 1d/2w; red dot for unread) and the open conversation on the right with a placeholder when none is selected. Bubbles are rounded (mine charcoal, theirs light), grouped by sender with the other member's avatar on the last of each run and centered time labels after gaps of an hour; the composer is a rounded pill with Send. On <=760px only one pane shows. The inbox refreshes every 15 seconds while visible. This supersedes the single-column Messages page and the unboxed conversation layout above.
- Connections shows each section as a compact card grid matching Members (3 columns desktop, 2 at <=1100px, 1 at <=520px): avatar, name and `job · company` on top, actions along the card bottom (Message fills the row beside the ⋮ menu; Accept/Decline split it; Cancel request is a quiet text action).
- Members without a trusted picture show a ghost person silhouette (`.avatar-ghost`, #a9aa9c on #e2e1d4, colors set inline so a stale stylesheet never renders it black), never initials. Google-generated letter pictures arrive as real image URLs and display as photos, in the community and in the Summit header Community button.
- The Summit header Community button shows the signed-in member's picture (or the ghost silhouette) from `GET /api/me` (name and validated avatar only, `private, no-store`, 401 when signed out or Supabase is unavailable). Summit pages still load no Supabase code; the avatar slot is inserted synchronously when the session cookie exists (using the picture cached in sessionStorage `82sw-me`, else the ghost) so the button never shifts between pages, then `/api/me` refreshes it; a 401 removes the slot and the cache, and network errors keep what is shown. `app.js` cache version 126, `style.css` 157.
- The members filter bar uses the card grid's 3 columns and shared `--members-gap`: search spans two card columns and Type + Search share the third (2 columns at <=1100px, stacked at <=760px). This supersedes the 6-track alignment.
- The homepage shows a Join Community toast at the bottom right (full width minus 10px gutters at <=800px) 1.2 seconds after load for every visitor; the title is always "82 Startup Community is open"; signed-in members (session cookie present) get member copy and an Open Community button that goes to `/members`. It uses the user-supplied Memoji sticker `public/assets/community-memoji.png` (transparent, 192px) shown at 80px with no frame or fill, a compact Join/Open Community button, a muted close button and a 4px offset shadow, Korean invitation copy and a Join Community button that opens the existing sign-in modal. Closing or joining stores `{at, member}` in localStorage (`82sw-join-toast-dismissed-at`) and hides it for 24 hours, except that a toast dismissed while signed in shows again as soon as the visitor is signed out (older plain-number records are ignored); storage failures simply show it again next visit.
- The homepage hero's secondary action is a Join Community underlined text link (`.text-link.community-entry`, the former Explore link style) that behaves exactly like the header button: the sign-in modal when signed out, `/members` (labelled Community) when signed in. It replaces the Explore the summit text link.
- The homepage hero no longer shows the SIX EVENTS. NEW CONNECTIONS. ENDLESS POSSIBILITIES. note; the hero ends with its actions.
- Sign out lives only on Settings (an Account card with a plain `POST /auth/signout` form), on desktop and mobile; the community sidebar no longer has a Sign out button, and `← Summit home` sits at its bottom.
- Mobile community header (<=760px): a sticky compact brand row with icon buttons at the top right for My profile and Settings (yellow when current; no Summit home button on mobile), then Members, Connections, Messages (and Admin for admins) as equal-width underlined tabs that never scroll (yellow text and underline when current), with smaller badges. Desktop keeps the full sidebar list.
- Every Summit page (Overview, Schedule, Speakers, Venue, Tickets) ends with a charcoal community card just above the footer, exactly as wide as the page content above it (between the `--rail` lines), on the paper background with 72px (48px mobile) of paper below it so it never touches the yellow footer: the user's Memoji, an `82 Startup Community ✳` eyebrow, a page-specific English title with Korean description (`communityCopy` in `public/app.js`), and a yellow Join Community button (`.community-entry`, so sign-in modal or `/members`). It is part of the shared `footer` template, so prerendered and client pages match; stacked with a full-width button at <=800px. Copy only describes real community features (directory, connections, messages, who is attending).
- Every large Summit button (all `.button` except the header's `.small`) shares one size: at least 260px wide and 58px tall (54px at <=800px) with label and arrow spread; the hero and community band buttons go full width at <=800px.
- The homepage hero has 60px of space below its action buttons (Get your tickets / Community), at every breakpoint. This adds to the earlier hero spacing values.
- The Summit sign-in iframe (`/login?modal=1`) renders without the public SiteHeader and SignupBar at the layout level (`AppChrome` reads the `modal` parameter only on `/login`, inside its own small Suspense, so other routes keep their prerendered shell), so they never flash while the form streams in.
- Both Continue with Google buttons show Google's official multicolour G logo (inline SVG) before the label; in the modal the Google button stays outlined and its hover keeps the logo readable (paper, not yellow).
- Message composer: Enter sends only on hardware keyboards, never during IME composition (including Safari keyCode 229), while a send is pending or on key repeat; on touch screens Enter is a line break. The members directory pins the viewer only when they are listed (shown in the directory with a name). Escape in the ⋮ menu closes only the menu. The Summit header clears its cached `82sw-me` profile when no session cookie is present.

## Community redesign push — October 29, 2026

The user explicitly requested a full check, community performance work and a push of all current changes as randyjlee. Verified GitHub account randyjlee with verified email randyjlee.hj@gmail.com; validate the exact candidate on an `integration/**` branch through CI, then push the same commit to default branch `main` without a PR or force push. The `kakao_url` migration was already applied to production. `.claude/` (local preview config) stays uncommitted. Community pages load their data in parallel (profile modal, conversation, members directory) and the sidebar badges use count functions.
