# 82 Startup — working rules

Public site for the 82 Startup community: events imported from Luma, plus member
profiles visible after login. Full design:
`docs/specs/2026-10-22-82startup-platform-design.md`.

## Current integration and release workflow

Root AGENTS.md is authoritative and supersedes the previous issue/branch/PR, pre-development approval and “ship it” requirements. The user authorized Summit landing integration, temporary community UI hiding, and direct commit/push to the verified default branch. Preserve community implementation for later integration; see README.md for routing. No hosting deployment is requested by this task. Latest user authorization now permits pushing the completed integration and visual changes as randyjlee, superseding the previous push hold for this change set; no hosting deployment is requested.

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
