# CLAUDE.md

@../CLAUDE.md
@AGENTS.md

## Stack

Next.js 16 (App Router) + next-sanity 12, backed by Sanity project `qwwmf79r`
(dataset `production`). Hosted on Netlify — the Next.js Runtime is declared
explicitly in `netlify.toml` (`[[plugins]] @netlify/plugin-nextjs`); it is
NOT auto-detected because this was an existing Gatsby site. Migrated in-place
from Gatsby on the `feat/migrate-to-nextjs` branch (Gatsby surface removed).

## Landmines

- Read `node_modules/next/dist/docs/` for Next 16 APIs — training data is stale
  (see `@AGENTS.md`). Next 16 request APIs are async and must be awaited.
- `sanity.types.ts` is generated and gitignored. `sanity.schema.json` IS
  committed (CI input). Never hand-edit either.
- `sanity.schema.json` is committed so CI `prebuild` (`sanity typegen
  generate`) works without the sibling Studio. Only local `predev`
  (`sanity:typegen`) re-extracts from `../bluepath-sanity`; when the Studio
  schema changes, run `pnpm run sanity:typegen` locally and commit the
  updated `sanity.schema.json`.
- Build is Turbopack (Next 16 default). Do not add a custom webpack config or
  ship with `--webpack`.
- Every styled-components consumer must be a Client Component (`'use client'`).
- Gatsby is fully removed. Rollback = git history / Netlify "Restore deploy",
  not working-tree files.
