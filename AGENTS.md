<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Next.js project rules

The block above belongs to Next.js. `next dev` rewrites everything between its markers, so keep
project rules here, below it.

Key Next 16 contracts to remember:

- `params`, `searchParams`, `draftMode()`, `cookies()`, `headers()` are all
  **async** — they must be `await`ed
  (`const { slug } = await params;`, `const { isEnabled } = await draftMode();`).
- The build uses **Turbopack** (Next 16 default). Do not add a custom webpack
  config. The build MUST pass without `--webpack`.
- styled-components consumers must be Client Components (`'use client'`); the
  styled-components runtime relies on hooks.