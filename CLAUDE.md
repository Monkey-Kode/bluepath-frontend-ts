# CLAUDE.md

@../CLAUDE.md
@AGENTS.md

## Stack

Next.js 16 (App Router) + next-sanity 13, backed by Sanity project `qwwmf79r`
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
- Two Sanity types have similar names. `casestudies` holds the Map Projects:
  the plants on the projects map and the ticker. `caseStudy` holds the Case
  Studies at `/case-studies/<slug>/`. A case study can link to map projects.
  Check which type a query needs.
- Only BlueIQ's feed and the Studio's Feed & imports pane write map projects.
  The Studio shows them read-only. The import code lives in `lib/mapProjects/`.

## Map project routes

- `app/api/blueiq/plants/route.ts` takes BlueIQ's daily CSV. The key travels
  in the `X-API-Key` header and must match `BLUEIQ_FEED_KEY`.
- `app/api/map-projects/route.ts` serves the Studio's Feed & imports pane. It
  takes POSTs only from the origin in `NEXT_PUBLIC_SANITY_STUDIO_URL`. Each
  POST also needs a request proof that the Studio saved in Sanity.
- `next.config.ts` sets `trailingSlash: true`. A route path without its
  trailing slash gets a 308.
- Both routes write through `sanity/lib/writeClient.ts` with
  `SANITY_API_WRITE_TOKEN`. It refuses the `production` dataset outside
  Netlify's production deploy. Local runs write to `development`.
- `.env.example` describes every env var. The write token and the feed key are
  server-only. Never give either one a `NEXT_PUBLIC_` name.

## Checks

- `pnpm test` runs Vitest. `pnpm run typecheck` runs `tsc`.
- Run `pnpm exec biome check --write <files>` on the files you change. The
  whole tree has older format failures.
- The `verify-site` skill in `.agents/skills/verify-site/` runs the site
  locally. It checks pages and routes in a real browser.
