# 82 Startup — unified Summit and community repository

The public entry point now uses the existing **82 Startup Week 2027** Summit site. The original Next.js community implementation is preserved for later integration.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The landing page and static routes do not require Supabase credentials. Community backend development still needs its original environment (`supabase start && ./scripts/dev-env.sh`).

## Layout and routing

- `public/`: canonical Summit HTML, CSS, JavaScript, event data, images, licenses and derived 3D venue viewer, imported from the current local `summit-2027/dist/`.
- `/` serves `public/index.html` before the preserved Next.js homepage. `/index.html`, `/schedule.html`, `/speakers.html`, `/venue.html` and `/tickets.html` remain available, including schedule day queries and relative asset links.
- The old community landing and navigation are hidden. `/events`, `/members`, `/connections`, `/messages`, `/profile`, `/settings`, `/login`, `/admin`, `/speakers`, `/sponsors` and their descendants temporarily redirect to `/` with HTTP 307. This is a UI launch gate, not API authorization.
- `src/app/`, `src/components/`, `src/lib/`, `supabase/`: existing community implementation retained. Auth callbacks, sign-out, unsubscribe, APIs, cron jobs and database access controls remain unchanged.
- `src/proxy.ts`: bypasses community sessions for Summit routes and temporarily gates community screens. A future community launch must deliberately revise this gate and add navigation.
- `docs/summit/`: imported design rules, event/source/license documentation and historical Summit README. Historical `dist/` references mean `public/` in this repository. Root AGENTS.md overrides historical workflow rules.

Edit the landing directly in `public/`; the original Summit folder is archived at `/Users/randy/project/_old/summit-2027` and is not an ongoing sync source. The independent original map source, nested Git directories, caches, credentials and historical hosting identity are not imported. The five events and individual Luma checkout links retain the Summit behavior; no local checkout or community database is used by the landing.

## Validation and delivery

```sh
npm run lint
npm test
npm run build
npm start
```

Database/access-rule tests remain available through `npm run test:db` with local Supabase running. Use a supported Node version (22.12+, 24 LTS or 26+). Complete authorized work by committing and pushing directly to the verified default branch using GitHub account `randyjlee` and verified email `randyjlee.hj@gmail.com`. No hosting deployment is part of this integration.

The large footer wordmark uses one text span centered by a grid on every page, retaining the existing typography and bottom alignment. CI also runs on temporary `integration/**` branches so required checks can pass on the exact candidate commit before a direct protected-main push.

Current user override: keep changes local; do not push any branch or deploy until explicitly requested again. This supersedes automatic delivery instructions above. The home hero now uses a 5% smaller title and tighter vertical spacing to reduce its total height by approximately 10%.

Active workspace: `/Users/randy/project/82_2027summit/82startup` only. The archived Summit folder retains its original map project and Git history at `/Users/randy/project/_old/summit-2027`. Do not modify the archive or push changes without a new user instruction.

The homepage hero spacing is now reduced by a further approximately 15% from the previous compact version; title size and all content are preserved. Changes remain local under the active push hold.

Latest delivery authorization: the user explicitly requested pushing the completed integration and visual changes with GitHub account `randyjlee`, superseding the previous push hold for this change set. Required CI must pass on the same commit before main is updated. No hosting deployment is requested.

## Current social and performance behavior

`npm run build:landing` prerenders the five public documents from `public/app.js`, preserving the first paint before JavaScript and embedding Open Graph/Twitter metadata directly for crawlers. Both dev and build run it automatically. The selected social image is `public/assets/og-startup-week-2027-zen-dots.jpg` at1200x630; PNG masters are retained. The production origin is https://82startup.vercel.app.

The homepage shows March15–21 only; individual events and other pages keep their existing dates. Hero visuals retain their design with a bounded24fps glyph simulation and cached calculations. Fonts load directly from HTML; page-specific scripts are omitted from unrelated pages. WebP artwork replaces heavy PNG downloads. The hosted map now loads external licensed Three.js and external plan images; it requires HTTP serving rather than opening a standalone HTML file. Its preview loads near the viewport and its full dialog remains on demand. Static assets cache for one day; documents remain fresh.

The user explicitly authorized committing/pushing and deploying these changes to the existing82-startup/82startup project using the required accounts, after verifying the exact commit on remote main. Team access may need approval before the deployment tools can operate; do not substitute accounts or create another project.
