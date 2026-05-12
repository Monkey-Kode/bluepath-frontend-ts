# Feature Specification: Migrate bluepath.studio from Gatsby to Next.js (Phase 1)

## Status

- Ready for implementation

## Overview

Replace the current Gatsby frontend with a Next.js (App Router) frontend backed by the same Sanity dataset, hosted on Netlify, with the Sanity Presentation Tool wired up for live preview. Phase 1 is a parity migration: visitors see the same site they see today, content editors gain click-to-edit live preview, and the production domain is swapped over. No visual or schema changes ship in this phase.

The detailed operational task list lives in [rough-plan.md](./rough-plan.md). This spec is the strategic and acceptance contract; the rough plan is the runbook the implementer follows.

## Problem Statement

The current Gatsby frontend is wedged on two fronts:

1. **Gatsby is effectively unmaintained.** The project is pinned to a pre-release (`5.14.0-next.4`) per `bluepath-gatsby-ts/CLAUDE.md`. There is no active release cadence to upgrade into, and ecosystem plugins (`gatsby-plugin-image`, `gatsby-source-sanity`, etc.) are accumulating compatibility risk against current React, Node, and Sanity versions.
2. **Sanity does not support live preview on Gatsby.** Sanity's Presentation Tool, draft-mode preview pattern, and stega-encoded responses are documented and supported on Next.js (and select others); Gatsby is not on that list. The authoring experience the team needs cannot be built on the current stack.

Migration is therefore not a discretionary "would be nice" — it is the lowest-cost path to a maintained framework with first-class Sanity authoring support.

## Goals

- **Primary**: Get off Gatsby and onto a maintained framework (Next.js 16 App Router) with first-class Sanity live preview, without regressing the visitor experience.
- **Secondary**: Establish the foundation (block-renderable Server Components, Presentation Tool, Studio document resolvers) that a future Phase 2 (block-based page builder, Studio polish, schema upgrades) can build on without re-platforming again.

## Core Requirements

### Functional Requirements

- **FR-001**: All current public URLs MUST continue to resolve at the same paths after cutover, including trailing-slash behavior. No public URL may 404 or redirect-loop.
- **FR-002**: All Gatsby `gatsby-node.ts` redirects MUST be ported to Next.js redirects (`/events` → `/news-and-events`, `/event/:slug` → `/events/:slug`, plus any others discovered during port).
- **FR-003**: The 4 production forms (`Case Study Request`, `Project Submission`, `events`, plus the documented fallback) MUST submit successfully through Netlify Forms and land in the same Netlify Forms inbox the Gatsby site uses today.
- **FR-004**: Authenticated content editors MUST be able to open Sanity's Presentation Tool, see the live frontend in the iframe, click any overlay marker, edit the underlying field, and observe the iframe update without a full page reload.
- **FR-005**: Anonymous visitors MUST see the published (non-draft) content. Draft content MUST NOT leak to anonymous visitors.
- **FR-006**: Google Tag Manager (`GTM-5BVGJ4Q`) MUST fire pageview events on initial load and on every client-side App Router route change. Container ID and event payloads must match current Gatsby behavior.
- **FR-007**: All current Sanity-driven content (every routable `page`, `event`, `news`, plus shared content like nav, footer, leadership, etc.) MUST render with the same components and same field mappings as Gatsby.
- **FR-008**: The Google Maps component (currently `react-google-maps`) MUST render with feature parity (markers, info windows, custom styling) using `@vis.gl/react-google-maps`.
- **FR-009**: The XML sitemap MUST be generated at build/deploy time and contain every routable Sanity document, matching the current `gatsby-plugin-sitemap` output.
- **FR-010**: Page metadata (title, description, OpenGraph tags) MUST be set via App Router `metadata` / `generateMetadata` exports and match the current `<Helmet>` output per page.

### Non-Functional Requirements

- **NFR-001 (Visual parity)**: Each page in the Next.js build, viewed at desktop (1440px), tablet (768px), and mobile (375px) widths, MUST be visually equivalent to the current Gatsby production site. "Visually equivalent" means: same layout, same components, same content, same fonts, same colors. Sub-pixel rendering differences and any drift caused by switching from `gatsby-plugin-image` to `sanity-image` (CDN-based delivery, slightly different `srcset` math) are explicitly acceptable.
- **NFR-002 (Functional parity)**: Every interactive feature on the Gatsby site MUST work on the Next.js site: forms, Maps, animations, navigation, redirects, 404 handling.
- **NFR-003 (Performance)**: No strict performance gate. Lighthouse scores and Core Web Vitals are expected to stay roughly comparable; any regression that pushes a page out of "Good" Core Web Vitals on the Gatsby baseline must be flagged and reviewed before cutover, but is not an automatic blocker.
- **NFR-004 (No data leakage)**: The Sanity read token (`SANITY_API_READ_TOKEN`) MUST NOT be included in any client bundle. `sanity/lib/token.ts` MUST `import 'server-only'` to enforce this at build time.

## Proposed Approach

Phase 1 is a one-shot replacement, not a strangler:

1. **Build the Next.js project in parallel** at `../bluepath-nextjs-ts/` while Gatsby continues to deploy unchanged.
2. **Pin exact dependency versions** (no carets) per the rough-plan version matrix, mirroring Sanity's official `sanity-template-nextjs-clean` reference template.
3. **Port content fetching from GraphQL to GROQ** via `next-sanity@12`'s `defineLive` / `sanityFetch`, with `<SanityLive />` rendered for all visitors (safe at this site's traffic level).
4. **Port components mechanically** following the find-and-replace patterns in rough-plan §1.7 — Gatsby imports → Next equivalents, `<GatsbyImage>` → `<SanityImage>` wrapper around the `sanity-image` package, every styled-components consumer marked `'use client'`.
5. **Wire Sanity Presentation Tool** in the Studio repo (`bluepath-sanity`) with `previewUrl`, document location resolvers, and CORS origins.
6. **Port Netlify Forms** by writing a static `public/__forms.html` with the 4 verified form definitions and pointing the JSX form AJAX at it.
7. **Cut over via Netlify domain swap** (blue/green), keeping the Gatsby site reachable at a fallback URL for ~2 weeks for instant rollback.

The rough-plan document captures the operational checklist (~13 sub-sections, ~80 tasks) and is the source of truth for execution.

## User Stories

### Story 1: Visitor sees the same site

**As a** site visitor
**I want to** browse bluepath.studio after the migration
**So that** I find the same content, layout, and forms I would have found before the migration

**Acceptance Criteria:**

- [ ] Given I visit any production URL after cutover, when the page loads, then I see the same content and layout as the pre-cutover Gatsby site at desktop/tablet/mobile breakpoints.
- [ ] Given I submit any form on the new site, when I press submit, then I am redirected to `/thankyou/` and a Netlify Forms entry is recorded in the existing inbox.
- [ ] Given I follow an old `/event/:slug` URL from an external link, when I land, then I am redirected (HTTP 308) to `/events/:slug`.

### Story 2: Editor uses live preview

**As a** content editor
**I want to** open a document in Sanity Studio's Presentation Tool, see the rendered page in the iframe, click on a piece of content, and edit it inline
**So that** I can author content with immediate visual feedback instead of switching between Studio and a separately-loaded preview

**Acceptance Criteria:**

- [ ] Given I open Presentation Tool against a `page`, `event`, or `news` document, when the iframe loads, then I see the document rendered as a visitor would see it, with click-to-edit overlay markers visible.
- [ ] Given I click an overlay marker, when the field opens in the side panel, then editing it causes the iframe content to update without a full page reload.
- [ ] Given I am not authenticated to the Studio, when I visit any frontend URL, then I see published (non-draft) content with no overlay UI and no draft data leakage.

### Story 3: Engineer can roll back

**As an** engineer
**I want to** revert to the Gatsby site quickly if something goes wrong post-cutover
**So that** a migration defect does not become a prolonged production incident

**Acceptance Criteria:**

- [ ] Given the production domain is pointed at the Next.js Netlify site, when an engineer flips the DNS or Netlify domain assignment back, then the Gatsby site serves traffic again within DNS TTL.
- [ ] Given the Gatsby Netlify site is preserved at a fallback URL for the rollback window, when an engineer needs to compare behavior, then both sites are reachable in parallel.

## Technical Constraints

- **Sanity project / dataset**: `qwwmf79r` / `production` — unchanged. No schema migration in Phase 1.
- **Hosting**: Netlify, with the OpenNext adapter (auto-applied by Netlify's Next.js detection).
- **URL stability**: `trailingSlash: true` in `next.config.ts` to preserve Gatsby's `trailingSlash: 'always'` behavior. All current public URLs must continue to resolve.
- **Forms**: Netlify Forms, joined to the same Netlify team so submissions land in the existing inbox.
- **Analytics**: GTM container `GTM-5BVGJ4Q`, ported via `next/script` with explicit App Router pageview tracking (Next does not auto-emit pageviews on route change).
- **Package manager**: pnpm (per project CLAUDE.md). Exact version pins via `--save-exact` or `save-exact = true` in `.npmrc`.
- **Node version**: 22 LTS (or 24 LTS if Netlify supports it at migration time), Volta-pinned in `package.json`.
- **Styling**: styled-components retained. Every consumer must be a Client Component (`'use client'`) — its runtime requires hooks. SSR is preserved via `StyledComponentsRegistry` and `useServerInsertedHTML`.
- **Type generation**: explicit two-step extract+generate per the Sanity reference template (Studio runs `sanity schema extract`; frontend runs `sanity typegen generate`). Wired as `predev`/`prebuild` scripts.

## Scope Boundaries

### What This Is NOT

- **Not a redesign.** No visual changes, no UX changes, no content changes ship in this migration. If something looks wrong post-migration, the bug is in the migration, not an opportunity to "improve while we're in there."
- **Not a schema migration.** The Sanity schema in `bluepath-sanity` is frozen for Phase 1. No new field types, no block-based page builder, no document type changes.
- **Not a Studio polish project.** Beyond the Presentation Tool configuration required for live preview to work, the Studio is left as-is.
- **Not a performance project.** Performance is expected to stay roughly comparable. Optimization passes are not in scope unless a regression pushes a page out of "Good" Core Web Vitals.
- **Not a Phase 2 deliverable.** Block-based page builder, content migration scripts, Studio theming, custom dashboards, and editor-facing polish (rough-plan §2.1–§2.5) are explicitly deferred to a future RFC. They are not in scope for this spec.
- **Not an analytics overhaul.** GTM container ID, dataLayer events, and any downstream analytics destinations are preserved as-is. If the team wants to drop or rework analytics, that is a separate intentional decision.
- **Not a Sanity API token rotation.** The existing read-with-drafts token is reused.

### Assumptions

- **A1 (Sanity framework support)**: Sanity's Presentation Tool, `next-sanity@12`, `defineLive`, and stega encoding work as documented in the `sanity-template-nextjs-clean` reference template against Next.js 16. If the template's pattern is broken on Next 16 at migration time, the migration pauses while we reconcile.
- **A2 (Netlify Node support)**: Netlify supports Node 22 LTS at migration time. If only Node 20 is supported and Next 16 requires Node 22, this becomes a hosting blocker — verify before scaffolding.
- **A3 (Sibling repo layout)**: `bluepath-sanity` and `bluepath-nextjs-ts` live as siblings on disk so the typegen script's `pnpm --dir ../bluepath-sanity exec sanity schema extract` invocation resolves. CI must replicate this layout.
- **A4 (Forms inbox inheritance)**: A new Netlify site joined to the same team inherits the same Forms inbox / notifications. Verified before cutover by submitting from a deploy preview.
- **A5 (Volta + pnpm + Netlify alignment)**: Node version pinned in `package.json` (Volta), `package-manager` field set to pnpm, and Netlify build environment variable / `netlify.toml` all agree. Note `netlify.toml` currently references `yarn` per `bluepath-gatsby-ts/CLAUDE.md` — verify deploy config in Netlify UI before relying on file contents.
- **A6 (Low traffic)**: The site's traffic volume is low enough that `<SanityLive />` rendered for every visitor does not exceed Sanity plan request limits. If traffic grows materially post-cutover, gate `<SanityLive />` to draft mode and add ISR/revalidateTag for visitor traffic.

## Critical Review

### Why This Approach

- **The framework swap is forced, not chosen.** Gatsby is not maintained, and Sanity does not support live preview on Gatsby. Staying put incurs growing maintenance cost and forecloses the authoring upgrade the team needs. Both alternatives — "stay on Gatsby" and "stay on Gatsby and build custom preview" — were rejected because Sanity's preview tooling does not target Gatsby.
- **Next.js + `next-sanity@12` is the well-trodden path.** Sanity ships a reference template (`sanity-template-nextjs-clean`) with this exact stack. Following the template removes most novel-architecture risk and makes our work findable in Sanity's docs and community.
- **Phase 1 is intentionally narrow.** Visual and schema changes are deferred so that any post-cutover bug isolates to "the migration broke this" rather than "the migration plus the redesign plus the schema change broke this." Narrow blast radius is the point.
- **Blue/green cutover keeps the rollback cheap.** Keeping the Gatsby site live at a fallback URL for ~2 weeks means a defect detected post-cutover is reversible in minutes, not days.

### Weak Spots / Trade-offs

- **Image fidelity will drift slightly.** `gatsby-plugin-image` builds optimized `srcset`s at build time with sharp; `sanity-image` requests CDN-derived URLs at runtime. The visual result is acceptable per NFR-001, but LCP and CLS will move. We're accepting this rather than building a custom image pipeline.
- **Presentation Tool is the headline feature, but it has dependencies.** Document location resolvers must exist for every routable type, and CORS origins must be configured correctly for credentials in dev, deploy preview, and production. Any one of these being misconfigured silently breaks live preview without breaking visitor traffic. QA must explicitly test Presentation Tool, not just the public site.
- **`<SanityLive />` for all visitors is safe today, fragile tomorrow.** It works at this site's traffic. If traffic grows by an order of magnitude, the request volume against Sanity's plan can spike. Mitigation is documented (gate to draft mode, ISR), but not implemented in Phase 1.
- **GTM regression risk.** App Router does not emit pageview events on client-side navigation by default. The wiring (`usePathname` + `useSearchParams` in a Client Component pushing to `dataLayer`) must be tested against the existing GTM container's tag triggers — easy to silently lose tracking.
- **Google Maps refactor is the riskiest non-trivial code change.** `@vis.gl/react-google-maps` is API-different from `react-google-maps`; the port to `MapContainer.tsx` and `ProjectsMap.tsx` is a real refactor, not a swap.
- **Typegen path fragility.** `pnpm --dir ../bluepath-sanity exec sanity schema extract` couples two repos at disk-layout level. CI and new clones can break silently.

## Alternatives Considered

### Alternative 1: Stay on Gatsby, build live preview manually

- **Description**: Keep the Gatsby site, build a custom preview route using Sanity's draft-mode pattern + `@sanity/preview-kit`, configure Presentation Tool to point at it.
- **Why rejected**: Sanity does not officially support Gatsby with live preview. The Presentation Tool, `defineLive`, stega encoding, and document overlays are documented and tested against Next.js (and select other frameworks). Building this on Gatsby means owning the integration ourselves indefinitely, against an unmaintained framework. Cost and risk both higher than migrating.

### Alternative 2: Migrate to Astro / SvelteKit / Remix instead

- **Description**: Migrate to a different modern framework with strong static-site support.
- **Why rejected**: Sanity's reference templates and Presentation Tool integration are richest on Next.js. Other frameworks have varying levels of Sanity support; choosing them adds integration risk without a corresponding benefit. Hiring and ecosystem also favor Next.js.

### Alternative 3: Strangler migration (page-by-page)

- **Description**: Run Gatsby and Next.js side-by-side, route-by-route via Netlify rewrites, until Gatsby is fully replaced.
- **Why rejected**: The site is small (~5 static pages, 3 dynamic templates). The strangler overhead — duplicate styled-components runtime, duplicate Sanity client config, route-handoff bugs — exceeds the cost of a one-shot swap with blue/green rollback. Strangler patterns earn their keep on large sites; this site is not large.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Forms break post-cutover (silent — submissions never land) | Medium | High | E2E test all 4 forms from a Netlify deploy preview before cutover. Verify each lands in the Forms inbox. Don't trust the JSX form alone — require `__forms.html` definition match. |
| GTM pageview events stop firing on client-side route changes | Medium | Medium | Wire pageview push in a Client Component using `usePathname` + `useSearchParams`. Verify in GTM debug mode against representative routes before cutover. |
| Live preview misconfigured (CORS, document resolvers, draft-mode endpoint) | Medium | Medium | QA Presentation Tool explicitly: every routable document type, click-to-edit on every block. Don't ship until at least one editor confirms it works. |
| Image fidelity regression noticed by stakeholders | Medium | Low | Side-by-side visual diff at 3 breakpoints before cutover. Set expectation up front: small drift is in scope per NFR-001. |
| `react-google-maps` → `@vis.gl/react-google-maps` refactor loses feature (markers, info windows, custom styling) | Medium | Medium | Inventory current Map features before refactoring. Test each on the new component before cutover. |
| Netlify Node version mismatch with Volta-pinned local Node | Low | Medium | Verify Netlify Node version is set explicitly (UI or `netlify.toml`); align with Volta pin. Note current `netlify.toml` references `yarn` — confirm via Netlify UI which is authoritative. |
| `<SanityLive />` request volume exceeds Sanity plan limits if traffic grows | Low | Medium | Monitor request counts in week 1 post-cutover. Documented fallback: gate to draft mode + ISR. Not implemented in Phase 1. |
| Sibling-directory typegen script breaks in CI or for new clones | Medium | Low | Document the layout requirement in the new project's CLAUDE.md. CI script must check both repos out at the expected paths. |
| Trailing-slash misconfiguration causes redirect loops or 404s | Low | High | Confirm `trailingSlash: true` in `next.config.ts`. Test every redirect rule and a sampling of public URLs from search results / external sources before cutover. |
| Hidden Gatsby plugins missed in plan (additional analytics, search, A/B, service workers) | Medium | Medium | Audit `gatsby-config.ts` plugins line-by-line before scaffolding. The GTM oversight in earlier drafts is a precedent — assume there's at least one more. |
| Content drift during migration (editors keep editing the live Gatsby site) | Medium | Low | Either (a) accept that the new site fetches the same Sanity dataset and is therefore always current, or (b) freeze content during the cutover window. Default to (a) since both sites read the same dataset; the only risk is if a schema-shaped field changes mid-migration, which is excluded from scope. |

## Acceptance Criteria

Cutover is gated on all of the following being true:

- [ ] Every public URL in the Gatsby production sitemap resolves on the Next.js site at the same path with the same trailing-slash behavior.
- [ ] Every redirect in `gatsby-node.ts` is ported and verified (HTTP 308, correct destination).
- [ ] All 4 production forms submit successfully from a Netlify deploy preview and land in the existing Netlify Forms inbox.
- [ ] Side-by-side visual review at desktop / tablet / mobile breakpoints across all 5 static pages and a representative sampling of dynamic routes (≥3 events, ≥3 news articles, all `page` slugs) shows no unintended visual differences.
- [ ] Google Maps component renders with all current features (markers, info windows, custom styling).
- [ ] All Framer Motion animations on the Gatsby site fire on the Next.js site.
- [ ] GTM container `GTM-5BVGJ4Q` fires pageview events on initial load AND on client-side route changes, verified in GTM debug mode.
- [ ] An authenticated content editor opens Presentation Tool, edits a field on each routable document type (`page`, `event`, `news`), and confirms the iframe updates without a full page reload.
- [ ] An anonymous browser session sees only published content with no draft data leakage and no overlay UI.
- [ ] The `SANITY_API_READ_TOKEN` is verifiably absent from any client bundle (search built `_next/static/` for the token value).
- [ ] XML sitemap is generated and contains every routable Sanity document.
- [ ] Page-level metadata (title, description, OG tags) matches Gatsby on a sampling of pages.
- [ ] Lighthouse runs on each of the 5 static pages and shows no regression from "Good" to "Needs improvement" or worse on any Core Web Vital.
- [ ] Production domain is swapped to the Next.js Netlify site; Gatsby site remains reachable at a fallback URL for ≥2 weeks.

## Open Questions

These are deferrable / minor and do not block implementation:

- Should the Phase 1 production deployment also remove the unused `generic` form fallback in `__forms.html`, or keep it as a safety belt? (Lean: drop it — both production form pages have non-null names, so the fallback is dead code.)
- After 2 weeks, when the Gatsby fallback URL is decommissioned, do we archive the Gatsby repo to a separate org or leave it in place read-only? (Either is fine; preference is read-only archive.)
- At what traffic threshold (monthly visits) do we revisit gating `<SanityLive />` to draft mode? (Suggest: revisit if monthly visits cross 25k or if Sanity dashboard shows >50% of plan request budget consumed on a monthly basis.)
- Any plugins in `gatsby-config.ts` beyond the ones already enumerated in the rough plan that need a Next.js equivalent? (Audit during 1.1 scaffolding before scope is locked.)

## Blockers

None. This spec is ready for implementation.
