# Migration plan: Gatsby → Next.js

Goal: replace the current Gatsby site with a Next.js (App Router) site backed by the same Sanity dataset, hosted on Netlify, with first-class Sanity visual editing.

Two phases. Phase 1 ships an MVP at parity with the current site plus live preview. Phase 2 upgrades the Sanity authoring experience.

---

## Assumptions

- **Framework**: **Next.js 16.x** with **`next-sanity@12.x`**. We follow the pattern in Sanity's official template (`sanity-io/sanity-template-nextjs-clean`) — Next 16 + next-sanity 12 + `<SanityLive />` always rendered. Sanity's request-overage warning article still exists, so monitor request counts post-launch as a sanity check, and keep the draft-mode-gated `<SanityLive />` fallback documented in case behavior diverges.
- **Preflight version pin** — exact versions, no carets. Bump these at migration time; lock to whatever is current then. As of May 8, 2026 the current latest are:
  - `next@16.2.6`
  - `next-sanity@12.4.5`
  - `sanity@5.24.0` (frontend dev dep — provides the typegen CLI)
  - `@sanity/client@7.22.0`
  - `@sanity/image-url@2.1.1`
  - `react@19.2.6`, `react-dom@19.2.6`
  - `sanity-image@1.1.0`
  - `@vis.gl/react-google-maps` — pin latest stable at install time
  - `@portabletext/react`, `groq` — pin latest stable
  Use pnpm's `--save-exact` (or set `save-exact = true` in `.npmrc`) so all installs land as exact pins.
- **Node**: 22 LTS (verify Netlify supports it at migration time — bump to 24 if available)
- **Image strategy**: `sanity-image@1.1.0` (the package Sanity's template uses) wrapped in our `SanityImage` component. Renders standard `<img>` tags loading from Sanity's CDN. Add `cdn.sanity.io` to `images.remotePatterns` in `next.config.ts` for compatibility with anything that may end up using `next/image` against Sanity URLs. Skip `next-sanity/image` (still alpha).
- **CMS client**: `next-sanity@12.x` with `defineLive` for live preview, `next-sanity/visual-editing` for the `<VisualEditing />` overlay. `<SanityLive />` renders for ALL visitors (documented next-sanity 12 pattern); only `<VisualEditing />` is gated to draft mode.
- **Sanity project**: `qwwmf79r` / dataset `production` (unchanged)
- **Hosting**: Netlify, OpenNext adapter (auto-applied)
- **Rendering mode**: the root layout calls `draftMode()`, which opts the route tree into dynamic rendering — so most routes will end up SSR/cached rather than purely static. Generate/cache visitor routes statically where possible; verify route output after `next build` and rely on Netlify/OpenNext's caching layer to keep visitor latency low.
- **URL trailing slashes**: set `trailingSlash: true` in `next.config.ts`. Gatsby currently uses `trailingSlash: 'always'` (`gatsby-config.ts:18`); keeping that behavior preserves all existing URLs and external inbound links.
- **Source layout**: new project at `../bluepath-nextjs-ts/` so Gatsby keeps deploying until cutover
- **Package manager**: pnpm. All scripts in this plan use `pnpm run` / `pnpm --dir`; substitute if working in a different manager.
- **Styling**: keep styled-components. Every component that uses styled-components must be a Client Component (`'use client'`) — its runtime relies on hooks. Client Components still server-render to HTML on initial load, so SEO and first paint are unaffected; what changes is the data-fetching boundary. Page-level Server Components call `sanityFetch` and pass plain JSON props down to Client styled children.
- **Type generation**: explicit two-step flow per the Sanity template — Studio runs `sanity schema extract --enforce-required-fields --path <frontend>/sanity.schema.json`; frontend runs `sanity typegen generate` against `./sanity.schema.json`. Wired as `predev`/`prebuild` scripts (see 1.2). Do not use `schemaExtraction.enabled: true` automatic mode — the explicit script is the template's documented pattern and gives clearer failure modes.

If any assumption is wrong, stop and confirm before proceeding.

---

# Phase 1 — MVP: parity + live preview

Outcome: visitors see the same site they see today, content editors get Sanity Presentation Tool with live preview, deployed on Netlify, ready to swap the production domain.

Scope explicitly excluded from Phase 1:

- New block types or schema changes
- Visual/UX changes to the site
- Sanity Studio polish beyond what live preview requires
- Performance work beyond what falls out naturally

## 1.1 Scaffold

- [ ] Create `bluepath-nextjs-ts/` next to the Gatsby project
- [ ] `pnpm create next-app` with TypeScript, App Router, no Tailwind, no ESLint preset (we'll bring our own), no `src/` if the agent prefers; otherwise match Gatsby's `src/`
- [ ] Volta-pin Node 22 LTS in `package.json` (verify Netlify currently supports the chosen version before pinning — if Node 24 LTS is supported at migration time, use that instead)
- [ ] Add styled-components, configure SWC compiler in `next.config.ts` (`compiler.styledComponents: true`). Also set `env: { SC_DISABLE_SPEEDY: 'false' }` in `next.config.ts` (per Sanity template's pattern when using styled-components — matches `sanity dev`'s fast CSS-rule insertion in both dev and prod).
- [ ] Set up `.env.local` with this exact naming (next-sanity convention, no aliases — keeps roles unambiguous):
  - `NEXT_PUBLIC_SANITY_PROJECT_ID` — the project ID (`qwwmf79r`)
  - `NEXT_PUBLIC_SANITY_DATASET` — the dataset (`production`)
  - `NEXT_PUBLIC_SANITY_API_VERSION` — pinned API version (e.g. `2026-01-01`)
  - `SANITY_API_READ_TOKEN` — server-only, has viewDrafts scope
  - `NEXT_PUBLIC_SANITY_STUDIO_URL` — the Studio URL, used by `stega.studioUrl` so click-to-edit overlays know where to deep-link
  - `NEXT_PUBLIC_SITE_URL` — the frontend's own origin, used by Presentation Tool config and `defineEnableDraftMode`
  - `NEXT_PUBLIC_GTM_ID` — `GTM-5BVGJ4Q`
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — for `@vis.gl/react-google-maps`
- [ ] Set up `tsconfig.json` with `@/*` path alias matching current `@src` usage
- [ ] Project-level CLAUDE.md mirroring the Gatsby one (landmines, package manager, Sanity IDs)

## 1.2 Sanity client + types

- [ ] Install runtime (exact-pinned): `next-sanity@12.4.5`, `@sanity/client@7.22.0`, `@sanity/image-url@2.1.1`, `@portabletext/react` (latest), `groq` (latest), `sanity-image@1.1.0`
- [ ] Install dev (for typegen CLI): `sanity@5.24.0` (the Studio package — its CLI runs `sanity typegen generate`)
- [ ] Add scripts mirroring the Sanity template (using pnpm):
  - `"predev": "pnpm run sanity:typegen"` — typegen runs before `next dev`
  - `"prebuild": "sanity typegen generate"` — typegen runs before `next build`
  - `"sanity:typegen": "pnpm --dir ../bluepath-sanity exec sanity schema extract --enforce-required-fields --path ../bluepath-nextjs-ts/sanity.schema.json && sanity typegen generate"` — extracts schema from Studio repo, generates types here
  - Adjust paths if the project layout differs from sibling-directories
- [ ] Create `lib/sanity/client.ts` with `createClient` configured for the project/dataset
- [ ] Create `lib/sanity/live.ts` exporting `sanityFetch` and `SanityLive` from `defineLive`
- [ ] Create `lib/sanity/queries.ts` — port every page/template query from Gatsby's GraphQL to GROQ (use `defineQuery` so typegen picks them up). Every query must have a unique name; inline queries are skipped by typegen.
- [ ] In the Next project, create `sanity.cli.ts` configuring `typegen.schema: './sanity.schema.json'`, `typegen.path: './sanity/**/*.{ts,tsx,js,jsx}'`, `typegen.generates: './sanity.types.ts'`, `overloadClientMethods: true`. With overload on, `client.fetch()` returns typed results when queries use `defineQuery`. The schema is produced by the explicit `pnpm run sanity:typegen` script (see 1.1) — do not rely on `schemaExtraction.enabled: true`.
- [ ] Replace every `Queries.PageQuery`, `Queries.SanityPage`, `Queries.SanityEvent`, `Queries.SanityNews` import with the typegen equivalents from `sanity.types.ts`

## 1.3 Image strategy

Following the Sanity reference template's pattern — use the `sanity-image` package wrapped in a tiny `SanityImage` component:

- [ ] Build `components/SanityImage.tsx` as a thin wrapper over `sanity-image`'s `<SanityImage>`, supplying `baseUrl={`https://cdn.sanity.io/images/${projectId}/${dataset}/`}`. ~10 lines of code (see template's `frontend/app/components/SanityImage.tsx`).
- [ ] Build `components/SanityBackgroundImage.tsx` — div with CSS `background-image` from `@sanity/image-url`'s `urlFor()`, plus a blur layer rendering the LQIP base64 string for the gatsby-background-image-style fade-in
- [ ] Adjust GROQ projections to fetch `asset->{url, metadata{dimensions, lqip}}`, hotspot, crop, alt — replacing `gatsbyImageData`
- [ ] Add `cdn.sanity.io` to `images.remotePatterns` in `next.config.ts` (the template does this — `sanity-image` renders standard `<img>` tags loading from the CDN; remotePatterns is needed only if any code falls back to `next/image` against Sanity URLs, which is harmless to allow either way)

## 1.4 Global layout, theme, fonts

- [ ] Port `Theme.tsx` (custom `mq` media-query helper, breakpoints) verbatim
- [ ] Port `createGlobalStyle` to `app/layout.tsx` via `StyledComponentsRegistry`
- [ ] Port web fonts (current `<link>` tags and any `@font-face`)
- [ ] Mirror Gatsby's `Layout` wrapper (used by both `gatsby-browser.tsx` and `gatsby-ssr.tsx`) as `app/layout.tsx`
- [ ] Port `Header`, `Footer`, `Nav` components — keep as Server Components where they don't need interactivity; mark client where needed

## 1.5 Static pages port (5 routes)

For each, create the matching App Router page, fetch via `sanityFetch`, render with the same components:

- [ ] `app/page.tsx` ← `src/pages/index.tsx`
- [ ] `app/leadership/page.tsx` ← `src/pages/leadership.tsx`
- [ ] `app/news-and-events/page.tsx` ← `src/pages/news-and-events.tsx`
- [ ] `app/thankyou/page.tsx` ← `src/pages/thankyou.tsx`
- [ ] `app/not-found.tsx` ← `src/pages/404.tsx`

## 1.6 Dynamic template ports (3 templates)

- [ ] `app/[slug]/page.tsx` ← `src/templates/Page.tsx` — `generateStaticParams` from `allSanityPage` minus the static slugs (`leadership`, `news-and-events`, `thankyou`, `404`)
- [ ] `app/events/[slug]/page.tsx` ← `src/templates/Event.tsx` — `generateStaticParams` from `allSanityEvent`
- [ ] `app/news/[slug]/page.tsx` ← `src/templates/NewsArticle.tsx` — `generateStaticParams` from `allSanityNews`
- [ ] Port custom `PortableTextComponents` from `NewsBody.tsx` and `Event.tsx`

## 1.7 Components port (~39 files)

Mechanical work, mostly find-and-replace patterns:

- [ ] `useStaticQuery(graphql\`...\`)`→ import from`lib/sanity/queries.ts` and fetch in the parent Server Component, pass props down
- [ ] `<GatsbyImage image={getImage(...)}>` → `<SanityImage>`
- [ ] `gatsby-background-image` → `<SanityBackgroundImage>`
- [ ] `import { Link } from 'gatsby'` → `import Link from 'next/link'` (drop `to=` for `href=`)
- [ ] `import { navigate } from 'gatsby'` → `useRouter().push()` from `next/navigation`
- [ ] Mark every component that uses styled-components as `'use client'`. In App Router, the styled-components runtime only operates in Client Components (it relies on hooks). Note: Client Components still server-render to HTML on initial load — they're not "client-only" — so first paint and SEO are unaffected. What changes is where the data-fetching boundary lives: page-level Server Components call `sanityFetch`, and pass plain JSON props down to the styled Client children.
- [ ] Set up `StyledComponentsRegistry` in `app/layout.tsx` using `useServerInsertedHTML` so the styled-components runtime collects styles during SSR and inserts them into the streamed HTML head (Next's documented pattern for CSS-in-JS).
- [ ] Replace `react-google-maps` (last release 2018, not React 19 compatible) with `@vis.gl/react-google-maps` (the current Google Maps team's React library). This is a real refactor of `MapContainer.tsx` and `ProjectsMap.tsx`, not a drop-in import swap.
- [ ] Remove `gbimage-bridge` and `convertToBgImage` (no longer needed)

## 1.8 Forms (Netlify Forms compatibility)

- [ ] Create `public/__forms.html` with a `<form>` definition for each of these names (verified against the live dataset):
  - `Case Study Request` — from `sanityPage` slug `case-study-request`, fields: name, company, position, email, phone, state, message, bot-field
  - `Project Submission` — from `sanityPage` slug `assessment-request`, fields: name, company, position, email, phone, state, message, bot-field
  - `events` — from `FormBasic.tsx`, fields: event-name (hidden), name, company, title, email, details, bot-field
  - (Optional safety belt) `generic` — fallback name in `Form.tsx` when `sanityPage.name` is null. Both production form pages have non-null names, so this should never fire, but include it to fail-safe.
- [ ] If new form pages are added in Sanity, the agent that adds them must also extend `__forms.html` and redeploy. Document this in the Studio README.
- [ ] Update `Form.tsx` and `FormBasic.tsx` AJAX target from `'/'` → `'/__forms.html'`
- [ ] Replace `navigate` from `gatsby` with `useRouter().push` for the `/thankyou` redirect
- [ ] Keep `data-netlify` and `data-netlify-honeypot` attributes on the JSX forms (inert at runtime, but required for clarity and matches the static HTML)
- [ ] Verify form submission end-to-end on a Netlify deploy preview before cutover

## 1.9 Routing extras

- [ ] Set `trailingSlash: true` in `next.config.ts` (see Assumptions). Gatsby has `trailingSlash: 'always'`; preserving the trailing slash keeps every existing URL stable.
- [ ] Port redirects from `gatsby-node.ts` to `next.config.ts` `redirects()` (all permanent). With `trailingSlash: true`, Next normalizes `/events` and `/events/` automatically, so a single rule covers both:
  - `/events` → `/news-and-events`
  - `/event/:slug` → `/events/:slug` (single dynamic rule, replaces the per-event redirects Gatsby emits at build time)
- [ ] Port sitemap: replace `gatsby-plugin-sitemap` with `next-sitemap` configured to read from Sanity
- [ ] Port metadata: convert any `<Helmet>` / `<Head>` usage to App Router `metadata` exports / `generateMetadata`
- [ ] **Port GTM** (correction — analytics IS wired). `gatsby-config.ts:57` includes `gatsby-plugin-google-tagmanager` with container `GTM-5BVGJ4Q`. Replace with `next/script` in `app/layout.tsx` using `strategy="afterInteractive"`, plus the noscript iframe fallback in `<body>`. Verify pageview events fire on App Router route changes (Next does not emit them by default — wire up via `usePathname` + `useSearchParams` in a Client Component that calls `dataLayer.push`).
- [ ] Port SVG-as-component: configure `@svgr/webpack` in `next.config.ts` to replace `gatsby-plugin-react-svg`

## 1.10 Live preview (the headline feature)

Mirror the Sanity reference template (`sanity-template-nextjs-clean/frontend`) — it's a known-good Next 16 + next-sanity 12 pattern.

- [ ] Configure the client with stega: `createClient({ ..., stega: { studioUrl } })` where `studioUrl` comes from `NEXT_PUBLIC_SANITY_STUDIO_URL`. Stega encodes invisible Source Map metadata into string responses so the overlay can locate document/field origins.
- [ ] Build `sanity/lib/live.ts` exporting `sanityFetch` and `SanityLive` from `defineLive({ client, serverToken: token, browserToken: token })`. The `browserToken` is required for stand-alone live previews; next-sanity only ships it to the browser inside a valid Draft Mode session.
- [ ] Create `app/api/draft-mode/enable/route.ts` using `defineEnableDraftMode({ client: client.withConfig({ token }) })` from `next-sanity/draft-mode`
- [ ] Create a Server Action `app/actions.ts` exposing `disableDraftMode()` that calls `(await draftMode()).disable()` (used by a draft-mode toast component)
- [ ] **Root `app/layout.tsx`** — render `<SanityLive />` for ALL visitors; gate only `<VisualEditing />` to draft mode:
  ```tsx
  const { isEnabled: isDraftMode } = await draftMode();
  return (
    <html>
      <body>
        {isDraftMode && <VisualEditing />}
        <SanityLive onError={handleError} />
        {children}
      </body>
    </html>
  );
  ```
  `<SanityLive />` is the documented pattern in next-sanity 12 — always rendered, drives live revalidation across all `sanityFetch` calls. Only the click-to-edit overlay is gated to authenticated draft-mode sessions. (This corrects the earlier draft of this plan, which over-applied the now-resolved Next 16 + next-sanity 11 mitigations.)
- [ ] Pass `{ stega: false }` to `sanityFetch` calls inside `generateMetadata` and `generateStaticParams` — stega-encoded strings would corrupt OpenGraph tags and break slug-based path generation
- [ ] In the Sanity Studio (`bluepath-sanity`), configure the Presentation Tool plugin in `sanity.config.ts`:
  - `previewUrl`: `{ origin: process.env.SANITY_STUDIO_PREVIEW_URL, previewMode: { enable: '/api/draft-mode/enable' } }` — note the key is `previewMode`, not `draftMode` (verified against the official template's `studio/sanity.config.ts`)
  - Document location resolvers mapping every routable type (`page`, `event`, `news`) to its frontend path
- [ ] Sanity → Manage → API → CORS Origins: add the frontend origins with credentials enabled — `http://localhost:3000`, the Netlify deploy preview URL pattern, and the production URL. Do not add `cdn.sanity.io` (image host, not an origin).
- [ ] Token security: store `SANITY_API_READ_TOKEN` in a `sanity/lib/token.ts` module with `import 'server-only'` at the top — prevents accidental client-bundle inclusion (matches the template's pattern).
- [ ] Verify end-to-end: open Presentation Tool → click an overlay → edit a field → confirm the iframe content updates seamlessly via `<SanityLive />` (no full page reload) and the click-to-edit overlay re-anchors

## 1.11 Hosting + deploy

- [ ] New Netlify site connected to a feature branch; let Netlify auto-detect Next.js (no need to pin `@netlify/plugin-nextjs`)
- [ ] Enable Netlify Forms (already enabled on the existing site — confirm the new site inherits the same team)
- [ ] Add env vars in Netlify UI matching `.env.local` (see 1.1): `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_SANITY_STUDIO_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Sanity → Manage → API → CORS Origins: add the Netlify deploy preview URL pattern and the production URL with credentials enabled (already covered in 1.10 — make sure both `localhost:3000` for dev and the deployed origins are present)
- [ ] Set `NETLIFY_NEXT_SKEW_PROTECTION=true` (low cost, prevents stale-bundle errors mid-deploy)

## 1.12 QA + parity check

- [ ] Side-by-side visual diff with the current Gatsby production site, page by page
- [ ] Test every form submission end-to-end and verify it lands in Netlify Forms inbox
- [ ] Test every redirect
- [ ] Test the Google Maps component
- [ ] Test all Framer Motion animations
- [ ] Test responsive breakpoints (mobile, tablet, desktop)
- [ ] Test the Presentation Tool live preview with a content editor
- [ ] Lighthouse pass — should be at least at parity with Gatsby
- [ ] After first week in production, sanity-check Netlify function invocation counts and Sanity API requests against pre-migration baselines. Should be similar or lower; investigate any unexpected spikes.

## 1.13 Cutover

- [ ] Point production domain at the new Netlify site
- [ ] Keep the Gatsby site live at a fallback URL for ~2 weeks
- [ ] Archive the Gatsby repo

---

# Phase 2 — Sanity authoring upgrade

Outcome: content editors stop calling it "an engineer's CMS." Same site visually, dramatically better editing experience.

Most of this work happens in `bluepath-sanity/`, not the Next.js project. Do it incrementally, ship one block at a time.

## 2.1 Block-based page builder

- [ ] Audit existing `sanityPage` content to identify recurring section patterns: hero, text+image, image grid, CTA, testimonial, FAQ, event list, news list, contact form, etc.
- [ ] Define a `pageBuilder: array` field on `page` schema with each pattern as a discrete object type
- [ ] For each block type:
  - Custom `preview` config showing a thumbnail + title + subtitle in the Studio document tree
  - Plain-English field labels and descriptions
  - Fieldsets to group related options and collapse advanced settings
  - Validation messages written for non-engineers
- [ ] Migrate existing content into the new block model (one-time migration script using `@sanity/client`)
- [ ] Render each block with a matching React component on the Next.js side
- [ ] Wire each block into the Presentation Tool with a per-block resolver so click-to-edit jumps to the right field

## 2.2 Studio polish

- [ ] Customize the Studio theme — logo, brand colors, custom navbar
- [ ] Reorder document types in the structure builder so the most-edited content (Pages, News, Events) is on top
- [ ] Document templates / starter content so "New page" begins with a sensible block layout
- [ ] Custom document badges (e.g. "Draft," "Scheduled," "Live") for visual scanability
- [ ] Field-level help text on every non-obvious field

## 2.3 Portable Text upgrade

- [ ] Define custom decorators and styles that match the rendered site (bold looks bold, headings look like headings in the editor)
- [ ] Custom inline blocks: callout boxes, pull quotes, image with caption, embedded CTA
- [ ] Custom rendering on the Next.js side via `PortableTextComponents`

## 2.4 Live preview refinements

- [ ] Verify every block type has a working click-to-edit overlay
- [ ] Configure preview pane heights and breakpoints in Presentation Tool config (mobile/tablet/desktop toggles)
- [ ] Per-document preview URLs for blog posts, events, etc.

## 2.5 Editor-facing polish

- [ ] Custom dashboard widget (Studio v3 plugin) showing recent submissions, unpublished drafts, scheduled releases
- [ ] Image library with tagging and alt-text validation
- [ ] SEO panel per document (title, description, OG image) with character-count guidance
- [ ] Internal link picker that resolves to live URLs

---

# Resolved decisions

1. **Studio schema**: frozen for Phase 1. Migration is a pure frontend swap — no schema changes until Phase 2.
2. **Domain cutover**: Netlify domain swap (blue/green), enables instant rollback.
3. **Analytics**: GTM IS wired (container `GTM-5BVGJ4Q` in `gatsby-config.ts:57`). Earlier assumption was wrong. Port via `next/script` with explicit App Router pageview tracking (see 1.9). If the user genuinely wants to drop analytics, do it as a separate intentional decision — don't silently lose tracking during the migration.
4. **Forms inbox**: new Netlify site joins the same team. Form submissions continue to land in the same inbox.
5. **Sanity API token**: existing read-with-drafts token works for the preview route.
6. **Type generation**: explicit two-step extract+generate flow per the Sanity reference template (see Assumptions and 1.1/1.2 for the wired scripts). Studio runs `sanity schema extract`; frontend runs `sanity typegen generate`. Avoid the `schemaExtraction.enabled: true` automatic path — failure modes are less obvious.
