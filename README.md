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

Edit the landing directly in `public/`; the sibling local Summit folder is a reference snapshot, not an ongoing sync source. The independent original map source, nested Git directories, caches, credentials and historical hosting identity are not imported. The five events and individual Luma checkout links retain the Summit behavior; no local checkout or community database is used by the landing.

## Validation and delivery

```sh
npm run lint
npm test
npm run build
npm start
```

Database/access-rule tests remain available through `npm run test:db` with local Supabase running. Use a supported Node version (22.12+, 24 LTS or 26+). Complete authorized work by committing and pushing directly to the verified default branch using GitHub account `randyjlee` and verified email `randyjlee.hj@gmail.com`. No hosting deployment is part of this integration.
