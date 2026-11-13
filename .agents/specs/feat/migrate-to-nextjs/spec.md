# Feature Specification: Migrate bluepathfinance.com from Gatsby to Next.js (Phase 1)

## Status

- Ready for implementation

## Overview

Replace the current Gatsby frontend with a Next.js (App Router) frontend backed by the same Sanity dataset, hosted on the same Netlify site, with the Sanity Presentation Tool wired up for live preview. Phase 1 is a parity migration: visitors see the same site they see today, content editors gain click-to-edit live preview, and the migration ships by merging a feature branch to `main` (no DNS or domain changes). No visual or schema changes ship in this phase.

The detailed operational task list lives in [rough-plan.md](./rough-plan.md). This spec is the strategic and acceptance contract; the rough plan is the runbook the implementer follows.

## Problem Statement

The current Gatsby frontend is wedged on two fronts:

1. **Gatsby is effectively unmaintained.** Local `package.json` is on `gatsby@^5.16.1`. There is no active release cadence to upgrade into, and ecosystem plugins (`gatsby-plugin-image`, `gatsby-source-sanity`, etc.) are accumulating compatibility risk against current React, Node, and Sanity versions.
2. **Sanity does not support live preview on Gatsby.** Sanity's Presentation Tool, draft-mode preview pattern, and stega-encoded responses are documented and supported on Next.js (and select others); Gatsby is not on that list. The authoring experience the team needs cannot be built on the current stack.

Migration is therefore not a discretionary "would be nice" — it is the lowest-cost path to a maintained framework with first-class Sanity authoring support.

## Goals

- **Primary**: Get off Gatsby and onto a maintained framework (Next.js 16 App Router) with first-class Sanity live preview, without regressing the visitor experience.
- **Secondary**: Establish the foundation (block-renderable Server Components, Presentation Tool, Studio document resolvers) that a future Phase 2 (block-based page builder, Studio polish, schema upgrades) can build on without re-platforming again.

## Core Requirements

### Functional Requirements

- **FR-001**: All current public URLs MUST continue to resolve at the same paths after cutover, including trailing-slash behavior. No public URL may 404 or redirect-loop.
- **FR-002**: All redirects from both `gatsby-node.ts` AND `netlify.toml` MUST be ported to Next.js `redirects()` in `next.config.ts`. Known set:
  - `/events` → `/news-and-events` (from `gatsby-node.ts`, permanent)
  - `/event/:slug` → `/events/:slug` (from `gatsby-node.ts`, permanent)
  - `/assessment-request` → `/connect` (from `netlify.toml`, 301)
  - `/assessment-request/*` → `/connect` (from `netlify.toml`, 301)
  Plus any others discovered during port. Verify each on the branch deploy preview.
- **FR-003**: The `events` form (RSVP form in `Event.tsx` via `FormBasic`) MUST submit successfully through Netlify Forms and land in the existing inbox, **with every populated field captured in the submission** (not just the subset wired to React state today). The `Case Study Request` form (sanityPage slug `case-study-request`, referenced from a `navigation` document) MUST also work, with the same all-fields requirement. Note: this implies fixing two pre-existing handler bugs (missing `preventDefault` in `FormBasic`; partial-`state` field drop in `Form.tsx`) by serializing via `new FormData(form)` — an intentional correctness deviation from strict bug-for-bug parity, flagged for stakeholder awareness. The `Project Submission` form (sanityPage slug `assessment-request`) is **already redirected away** in `netlify.toml` and SHOULD NOT be wired in `__forms.html` — preserve the redirect (see FR-002) instead of resurrecting the form. Branch deploys on the same Netlify site mean the Forms inbox is inherited by construction; no new site or team migration required.
- **FR-004**: Authenticated content editors MUST be able to open Sanity's Presentation Tool, see the live frontend in the iframe, click any overlay marker, edit the underlying field, and observe the iframe update without a full page reload.
- **FR-005**: Anonymous visitors MUST see the published (non-draft) content. Draft content MUST NOT leak to anonymous visitors.
- **FR-006**: Google Tag Manager (`GTM-5BVGJ4Q`) MUST fire pageview events on initial load and on every client-side App Router route change. Container ID and event payloads must match current Gatsby behavior.
- **FR-007**: All current Sanity-driven content (every routable `page`, `event`, `news`, plus shared content like nav, footer, leadership, etc.) MUST render with the same components and same field mappings as Gatsby.
- **FR-008**: The Google Maps components MUST render with feature parity (markers, info windows, custom styling). The active implementations in `Projects.tsx` and `ContactBody.tsx` already use `@googlemaps/js-api-loader` directly — port these as-is. The dead `react-google-maps` chain (`MapContainer.tsx`, `Map.tsx`, `ProjectsMap.tsx`) MUST be deleted along with the `react-google-maps` dependency.
- **FR-009**: The XML sitemap MUST be generated at build/deploy time and contain every routable Sanity document, matching the current `gatsby-plugin-sitemap` output.
- **FR-010**: Page metadata (title, description, OpenGraph tags) MUST be set via App Router `metadata` / `generateMetadata` exports and match the current output. The Gatsby site uses Gatsby's `Head` export pattern (`HeadFC` / `HeadProps`, e.g. `src/pages/index.tsx:85`) with the shared `SEO.tsx` component as the source of truth for title/description/OG tags — port that component's logic into the Next equivalent.

### Non-Functional Requirements

- **NFR-001 (Visual parity)**: Each page in the Next.js build, viewed at desktop (1440px), tablet (768px), and mobile (375px) widths, MUST be visually equivalent to the current Gatsby production site. "Visually equivalent" means: same layout, same components, same content, same fonts, same colors. Sub-pixel rendering differences and any drift caused by switching from `gatsby-plugin-image` to `sanity-image` (CDN-based delivery, slightly different `srcset` math) are explicitly acceptable.
- **NFR-002 (Functional parity)**: Every interactive feature on the Gatsby site MUST work on the Next.js site: forms, Maps, animations, navigation, redirects, 404 handling.
- **NFR-003 (Performance)**: No strict performance gate. Lighthouse scores and Core Web Vitals are expected to stay roughly comparable; any regression that pushes a page out of "Good" Core Web Vitals on the Gatsby baseline must be flagged and reviewed before cutover, but is not an automatic blocker.
- **NFR-004 (No data leakage)**: The Sanity read token (`SANITY_API_READ_TOKEN`) MUST NOT be included in any client bundle. `sanity/lib/token.ts` MUST `import 'server-only'` to enforce this at build time.

## Proposed Approach

Phase 1 is a one-shot replacement, not a strangler:

1. **Build in-place on a feature branch** of the existing `bluepath-gatsby-ts` repo. Gatsby code on `main` keeps deploying production until merge. The branch deploys as a Netlify branch preview off the existing site.
2. **Install latest stable dependencies** (default caret ranges, no `--save-exact`) per the rough-plan version matrix, mirroring Sanity's official `sanity-template-nextjs-clean` reference template.
3. **Port content fetching from GraphQL to GROQ** via `next-sanity@12`'s `defineLive` / `sanityFetch`, with `<SanityLive />` rendered for all visitors (safe at this site's traffic level).
4. **Port components mechanically** following the find-and-replace patterns in rough-plan §1.7 — Gatsby imports → Next equivalents, `<GatsbyImage>` → `<SanityImage>` wrapper around the `sanity-image` package, every styled-components consumer marked `'use client'`.
5. **Wire Sanity Presentation Tool** in the Studio repo (`bluepath-sanity`) with `previewUrl`, document location resolvers, and CORS origins.
6. **Port Netlify Forms** by writing a static `public/__forms.html` with definitions for the confirmed-active forms (per the audit) and pointing the JSX form AJAX at it.
7. **Ship by merging the branch to `main`.** Netlify auto-deploys to `https://bluepathfinance.com`. No DNS swap, no second site. Rollback path is Netlify "Restore deploy" on the previous Gatsby production deploy, or `git revert` the merge commit.

The rough-plan document captures the operational checklist (~13 sub-sections, ~80 tasks) and is the source of truth for execution.

## User Stories

### Story 1: Visitor sees the same site

**As a** site visitor
**I want to** browse bluepathfinance.com after the migration
**So that** I find the same content, layout, and forms I would have found before the migration

**Acceptance Criteria:**

- [ ] Given I visit any production URL after cutover, when the page loads, then I see the same content and layout as the pre-cutover Gatsby site at desktop/tablet/mobile breakpoints.
- [ ] Given I submit any form on the new site, when I press submit, then I am redirected to `/thankyou/` and a Netlify Forms entry is recorded in the existing inbox.
- [ ] Given I follow an old `/event/:slug` URL from an external link, when I land, then I am redirected (HTTP 301, matching current production) to `/events/:slug`.

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

- [ ] Given the migration branch is merged to `main` and deployed, when an engineer uses Netlify's "Restore deploy" on the last Gatsby production deploy (or `git revert`s the merge commit and pushes), then the Gatsby site serves traffic again within one deploy cycle. No DNS changes required.
- [ ] Given the previous Gatsby production deploy remains in Netlify's deploy history, when an engineer needs to compare behavior, then they can spin up a deploy preview from the previous commit or use Netlify's deploy URL for that build.

## Technical Constraints

- **Sanity project / dataset**: `qwwmf79r` / `production` — unchanged. No schema migration in Phase 1.
- **Hosting**: Netlify, same site as today, with the OpenNext adapter (auto-applied by Netlify's Next.js detection). No new Netlify site, no DNS changes.
- **URL stability**: `trailingSlash: true` in `next.config.ts` to preserve Gatsby's `trailingSlash: 'always'` behavior. All current public URLs must continue to resolve.
- **Forms**: Netlify Forms on the same site — submissions land in the existing inbox by construction.
- **Analytics**: GTM container `GTM-5BVGJ4Q`, ported via `next/script` with explicit App Router pageview tracking (Next does not auto-emit pageviews on route change).
- **Package manager**: pnpm (per project CLAUDE.md). Install with default caret ranges; do not set `--save-exact` or `save-exact = true`.
- **Node version**: 22 LTS (or 24 LTS if Netlify supports it at migration time), Volta-pinned in `package.json`.
- **Styling**: styled-components retained. Every consumer must be a Client Component (`'use client'`) — its runtime requires hooks. SSR is preserved via `StyledComponentsRegistry` and `useServerInsertedHTML`.
- **Type generation**: explicit two-step extract+generate per the Sanity reference template (Studio runs `sanity schema extract`; frontend runs `sanity typegen generate`). Wired as `predev`/`prebuild` scripts.
- **Build tooling**: Turbopack (Next 16 default). No custom webpack config — SVG-as-component handled Turbopack-natively (SVGR via `turbopack.rules`, or hand-written `.tsx` components). The build MUST pass without `--webpack`.
- **Agent docs**: `AGENTS.md` + `CLAUDE.md` wired to Next's version-matched bundled docs (`node_modules/next/dist/docs/`) so the implementing agent uses Next 16 APIs, not stale training data. Next 16 request APIs (`params`, `searchParams`, `draftMode()`, `cookies()`, `headers()`) are async and must be awaited.

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
- **A3 (Sibling repo layout)**: `bluepath-sanity` and `bluepath-gatsby-ts` (the in-place migration repo) live as siblings on disk so the typegen script's `pnpm --dir ../bluepath-sanity exec sanity schema extract` invocation resolves. CI must replicate this layout if typegen runs in CI.
- **A4 (Forms inbox continuity)**: Branch deploys on the same Netlify site keep submissions on the same Forms inbox by construction. Verified before cutover by submitting from a deploy preview.
- **A5 (Volta + pnpm + Netlify alignment)**: Node version pinned in `package.json` (Volta), `package-manager` field set to pnpm, and Netlify build environment variable / `netlify.toml` all agree. `netlify.toml` already uses `pnpm run build`; verify the deploy environment in Netlify UI matches before merging.
- **A6 (Low traffic)**: The site's traffic volume is low enough that `<SanityLive />` rendered for every visitor does not exceed Sanity plan request limits. If traffic grows materially post-cutover, gate `<SanityLive />` to draft mode and add ISR/revalidateTag for visitor traffic.

## Critical Review

### Why This Approach

- **The framework swap is forced, not chosen.** Gatsby is not maintained, and Sanity does not support live preview on Gatsby. Staying put incurs growing maintenance cost and forecloses the authoring upgrade the team needs. Both alternatives — "stay on Gatsby" and "stay on Gatsby and build custom preview" — were rejected because Sanity's preview tooling does not target Gatsby.
- **Next.js + `next-sanity@12` is the well-trodden path.** Sanity ships a reference template (`sanity-template-nextjs-clean`) with this exact stack. Following the template removes most novel-architecture risk and makes our work findable in Sanity's docs and community.
- **Phase 1 is intentionally narrow.** Visual and schema changes are deferred so that any post-cutover bug isolates to "the migration broke this" rather than "the migration plus the redesign plus the schema change broke this." Narrow blast radius is the point.
- **Branch deploy + Netlify Restore keeps rollback cheap.** Shipping by merging a feature branch on the existing Netlify site (no new site, no DNS swap) means rollback is a one-click "Restore deploy" on the previous Gatsby production deploy, or a `git revert` of the merge commit. Defects are reversible in minutes.

### Weak Spots / Trade-offs

- **Image fidelity will drift slightly.** `gatsby-plugin-image` builds optimized `srcset`s at build time with sharp; `sanity-image` requests CDN-derived URLs at runtime. The visual result is acceptable per NFR-001, but LCP and CLS will move. We're accepting this rather than building a custom image pipeline.
- **Presentation Tool is the headline feature, but it has dependencies.** Document location resolvers must exist for every routable type, and CORS origins must be configured correctly for credentials in dev, deploy preview, and production. Any one of these being misconfigured silently breaks live preview without breaking visitor traffic. QA must explicitly test Presentation Tool, not just the public site.
- **`<SanityLive />` for all visitors is safe today, fragile tomorrow.** It works at this site's traffic. If traffic grows by an order of magnitude, the request volume against Sanity's plan can spike. Mitigation is documented (gate to draft mode, ISR), but not implemented in Phase 1.
- **GTM regression risk.** App Router does not emit pageview events on client-side navigation by default. The wiring (`usePathname` + `useSearchParams` in a Client Component pushing to `dataLayer`) must be tested against the existing GTM container's tag triggers — easy to silently lose tracking.
- **Google Maps risk is lower than initially scoped.** The active map code in `Projects.tsx` and `ContactBody.tsx` already uses `@googlemaps/js-api-loader` directly — porting these to Next is mechanical (mark `'use client'`, audit `useEffect` cleanup). The `react-google-maps`-based chain (`MapContainer.tsx`, `Map.tsx`, `ProjectsMap.tsx`) is dead code — verified that nothing outside the chain imports it — and gets deleted along with the dependency.
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
- **Why rejected**: The site is small (~5 static pages, 3 dynamic templates). The strangler overhead — duplicate styled-components runtime, duplicate Sanity client config, route-handoff bugs — exceeds the cost of a one-shot branch-merge cutover with Netlify Restore as the rollback path. Strangler patterns earn their keep on large sites; this site is not large.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Forms break post-merge (silent — submissions never land) | Medium | High | E2E test every confirmed-active form from the branch deploy preview before merging. Verify each lands in the existing Forms inbox. Don't trust the JSX form alone — require `__forms.html` definition match. |
| GTM pageview events stop firing on client-side route changes | Medium | Medium | Wire pageview push in a Client Component using `usePathname` + `useSearchParams`. Verify in GTM debug mode against representative routes from the branch deploy preview before merging. |
| Live preview misconfigured (CORS, document resolvers, draft-mode endpoint) | Medium | Medium | QA Presentation Tool explicitly: every routable document type, click-to-edit on every block. Don't merge until at least one editor confirms it works. |
| Image fidelity regression noticed by stakeholders | Medium | Low | Side-by-side visual diff at 3 breakpoints from the branch deploy preview before merging. Set expectation up front: small drift is in scope per NFR-001. |
| Active map code (`Projects.tsx`, `ContactBody.tsx`) breaks during Server/Client boundary shift | Low | Medium | Mark each as `'use client'`; verify the `@googlemaps/js-api-loader` initialization runs once per mount and cleans up. Inventory current map features (markers, info windows, custom styling) and test each on the branch deploy preview. |
| Netlify Node version mismatch with Volta-pinned local Node | Low | Medium | Verify Netlify Node version is set explicitly (UI or `netlify.toml`); align with Volta pin. `netlify.toml` already uses `pnpm run build`; confirm Netlify UI deploy settings match before merging. |
| `<SanityLive />` request volume exceeds Sanity plan limits if traffic grows | Low | Medium | Monitor request counts in week 1 post-cutover. Documented fallback: gate to draft mode + ISR. Not implemented in Phase 1. |
| Sibling-directory typegen script breaks in CI or for new clones | Medium | Low | Document the layout requirement in the project's CLAUDE.md. If typegen runs in CI, ensure both repos are checked out at the expected paths. |
| Trailing-slash misconfiguration causes redirect loops or 404s | Low | High | Confirm `trailingSlash: true` in `next.config.ts`. Test every redirect rule and a sampling of public URLs from search results / external sources on the branch deploy preview before merging. |
| Hidden Gatsby plugins missed in plan (additional analytics, search, A/B, service workers) | Medium | Medium | Audit `gatsby-config.ts` plugins line-by-line before scaffolding. The GTM oversight in earlier drafts is a precedent — assume there's at least one more. |
| Content drift during migration (editors keep editing the live Gatsby site) | Medium | Low | Both Gatsby `main` and the migration branch read the same Sanity dataset, so the new site is always current with whatever editors publish. The only risk is if a schema-shaped field changes mid-migration, which is excluded from scope (schema is frozen for Phase 1). |

## Acceptance Criteria

Merging the migration branch to `main` is gated on all of the following being true on the branch deploy preview:

- [ ] Every public URL in the Gatsby production sitemap resolves on the branch deploy at the same path with the same trailing-slash behavior.
- [ ] Every redirect in `gatsby-node.ts` AND `netlify.toml` is ported to `next.config.ts` `redirects()` and verified (correct status code, correct destination) — including `/assessment-request` and `/assessment-request/*` → `/connect`.
- [ ] Every confirmed-active form (per audit) submits successfully from the branch deploy preview and lands in the existing Netlify Forms inbox, with every populated field present in the inbox entry (explicitly verify `company` on the `Case Study Request` form — it is dropped today).
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
- [ ] The previous Gatsby production deploy is preserved in Netlify's deploy history; rollback path via Netlify "Restore deploy" or `git revert` of the merge commit is documented and confirmed reachable by an engineer.

## Open Questions

These are deferrable / minor and do not block implementation:

- ~~Should the Phase 1 deployment include the `Project Submission` form in `__forms.html`?~~ **Resolved**: `netlify.toml` already redirects `/assessment-request` and `/assessment-request/*` to `/connect`. The form is dormant by design. Preserve the redirect (FR-002), skip the form definition (FR-003).
- After ~2 weeks of stable production on Next, when is the right moment to delete Gatsby files from `main` (rather than leaving them as dead code)? (Lean: do it in a follow-up commit once an engineer is satisfied no rollback is needed. The Netlify deploy history preserves the Gatsby builds regardless of repo state.)
- At what traffic threshold (monthly visits) do we revisit gating `<SanityLive />` to draft mode? (Suggest: revisit if monthly visits cross 25k or if Sanity dashboard shows >50% of plan request budget consumed on a monthly basis.)
- Any plugins in `gatsby-config.ts` beyond the ones already enumerated in the rough plan that need a Next.js equivalent? (Audit during 1.1 scaffolding before scope is locked.)

## Blockers

None. This spec is ready for implementation.
