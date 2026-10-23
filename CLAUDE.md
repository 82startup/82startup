# 82 Startup — working rules

Public site for the 82 Startup community: events imported from Luma, plus member
profiles visible after login. Full design:
`docs/specs/2026-10-22-82startup-platform-design.md`.

## Every piece of work is a thread

One GitHub Issue → one branch → one git worktree → one owner.

- Branch: `<person>/<issue#>-<slug>` (e.g. `kiha/3-auth-profiles`)
- Worktree: `.worktrees/<issue#>-<slug>` (git-ignored)
- Never push to `main`. `main` changes only by merging a pull request.

## Stages

**Stage 1 — Brainstorm & requirements.** Write the spec to
`docs/specs/<YYYY-MM-DD>-<issue#>-<topic>.md`. Stop and get the owner's explicit
approval. No code before approval.

**Stage 2 — Development.** Write the plan to
`docs/plans/<YYYY-MM-DD>-<issue#>-<topic>.md`, then build with tests written
first. If the work outgrows the approved spec, return to Stage 1 for that part.

**Stage 3 — Test.** Run all automated checks, QA in a browser, hand it to the
owner. **Release only after the owner says "ship it".**

**Release.** Push branch → open PR → checks pass → merge to `main` → production
deploys automatically → health check → close the issue → remove the worktree.

Small changes (typos, minor fixes) skip the spec and plan but still need "ship it".

## Production safety

- Database changes only via timestamped migration files. Never edit production data by hand.
- Bring the branch up to date with `main` before merging.
- Secrets never in code, chat or commits (Vercel/Supabase settings, password manager).
- Rollback: Vercel instant rollback; database: forward-fix migration.
- The Luma API key is server-only and has full access to the calendar.

## Environments

| Environment | Database | Luma calendar |
|---|---|---|
| Local | Local Supabase | fake adapter in tests |
| Preview | Preview Supabase project | test calendar |
| Production | Production Supabase project | production calendar |

## Local development

    supabase start && ./scripts/dev-env.sh   # once per session; writes .env.local
    npm run dev                              # app on :3000
    npm test                                 # unit tests
    npm run test:db                          # database + access-rule tests

Local Supabase uses non-default ports (api 55321, db 55322, studio 55323,
inbucket 55324), not 54321, because another project's stack holds the defaults.

## Next.js 16 notes

- Middleware is now called Proxy: the file is `proxy.ts`, not `middleware.ts`.
- `cookies()` and `params` are async: `await` them.
- Only `NEXT_PUBLIC_` variables reach client code, and they are inlined at build
  time, so changing one needs a rebuild.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

@AGENTS.md
