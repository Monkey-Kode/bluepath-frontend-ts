# Feature Specification: Impact Page Redesign (Carbon Offsets + Environmental Impact)

## Status

- Ready for implementation

## Overview

The Impact page's two interactive sections — **Carbon Offset Equivalancies** and **Environmental Impact Measurement** — are being rebuilt to a new, simpler design (fika, "Impact Page + Landing", May 2026). The underlying numbers are largely unchanged; the layout and interactions change substantially. Carbon Offsets moves from a "hive" of hexagon cells to a fixed horizontal row of icons with tab-swapped values beneath each. Environmental Impact moves from a static 4-up grid to a select-and-reveal interaction where the chosen icon slides to the lead position and its stats animate in.

Alongside the visual rebuild, the section content is **consolidated in the CMS**: the 7 standalone documents that currently hold this data (3 carbon tabs + 4 impact items, plus the vestigial tabs/hexagon types) are replaced by a **single Impact-content singleton** with inline arrays. This co-locates editing, enables drag-to-reorder (removing every manual `order` field), and makes click-to-edit land in one form.

## Problem Statement

Two problems, addressed together because the data must be migrated only once:

1. **The current design can't be expressed by the current data.** Carbon Offsets stores 10 separate, unlinked hexagons per tab (5 icon-only + 5 text-only) in an order that doesn't map to the new left-to-right layout, with no field connecting an icon to its number. The new design needs each icon paired with its own value + label, in display order.
2. **The editing workflow is fragmented.** Section content lives across 7 standalone documents under a "Custom Content" desk area, separate from the `page` document (which holds Heading/background/SEO under "Pages") and ordered via brittle manual `order` numbers. Click-to-edit already works via Presentation/stega, but discoverability and coherence are poor.

A singleton with inline arrays solves both: it gives the icon↔value↔label pairing a natural home, replaces `order` fields with array position, and unifies editing.

## Goals

- Ship the new Carbon Offsets layout: 3 lifecycle tabs (PROJECT LIFE / USEFUL LIFE / AS OF TODAY) over a fixed row of 5 icons, each icon showing its own value + label for the active tab.
- Ship the new Environmental Impact interaction: 4-icon grid that, on selection, promotes the chosen icon to the lead position and reveals its 3 stats + summary line.
- Consolidate all Impact section content into a single Sanity singleton with inline arrays; migrate existing content into it once.
- Eliminate manual `order` fields in favour of array position (drag-to-reorder).
- Add fade-in/out + bounce motion to all icon/tab interactions using the existing framer-motion library.
- Deliver a coherent mobile layout (2-column icon grid; vertically stacked data on selection).
- Remove the dead hive code and the now-orphaned standalone document types.

## Core Requirements

### Functional Requirements — Carbon Offsets

- FR-001: System MUST render 3 lifecycle tabs (PROJECT LIFE, USEFUL LIFE, AS OF TODAY) sourced from the singleton's `carbonOffsetTabs` array, in array order.
- FR-002: System MUST render a **fixed** horizontal row of 5 metric icons that stays constant across tab changes (icons do not move or swap when tabs change).
- FR-003: Below each icon, system MUST display that metric's **value** (large) and **label** (small) for the active tab.
- FR-004: User MUST be able to switch tabs; switching MUST swap all 5 value/label pairs to the selected tab's data while icons remain fixed.
- FR-005: Tab switches MUST animate the value/label text with a fade + bounce transition (framer-motion).
- FR-006: On load, the first tab (PROJECT LIFE) MUST be active with its values visible.
- FR-007: On mobile, the 5 icons MUST lay out in a 2-column grid, each with its value/label beneath it, tabs rendered above.

### Functional Requirements — Environmental Impact

- FR-010: Initial state MUST be a horizontal row of the 4 category icons with the tab labels (SOLAR PROJECTS | BUILDING ENERGY | WATER CONSERVATION | CO2 REDUCTION) above, **no category selected**.
- FR-011: Selecting a category (by clicking its icon **or** its tab label) MUST open that category: the selected icon animates to the leftmost position, the other 3 icons exit, and the category's 3 stats (value + label) plus its summary line animate in to the right.
- FR-012: The active category's tab label MUST be highlighted; the other tab labels MUST remain visible and clickable to switch categories.
- FR-013: Switching categories while open MUST cross-fade icon + content to the newly selected category (no need to collapse first).
- FR-014: Clicking the currently active (visible) icon MUST collapse back to the 4-icon grid (no selection).
- FR-015: Enter/exit transitions MUST use fade + bounce (framer-motion), with stats permitted to stagger.
- FR-016: Stat values MUST render with thousands separators (e.g. `56657` → `56,657`) unless the migrated value already includes them.
- FR-017: On mobile, the collapsed state MUST be a 2-column icon grid; the tab labels MUST render as a horizontal row/scroll; the open state MUST show the selected icon on top with its stats stacked vertically below.

### Functional Requirements — CMS Model & Data

- FR-020: A new **singleton** document MUST hold all Impact section content (fixed document id, surfaced as a single-document desk entry like the existing `homevideo`/`siteSettings` singletons). It MUST contain two inline arrays: `carbonOffsetTabs` and `environmentalCategories`.
- FR-021: A `carbonOffsetTab` array member MUST be `{ name (string, tab label), metrics: carbonOffsetMetric[] }`. A `carbonOffsetMetric` MUST be `{ icon (image), value (string display value, e.g. "4.5 Billion"), label (string/text descriptor) }`. Each tab holds exactly **5** metrics (validated to the design count). Display order is array order; no `order` field.
- FR-022: An `environmentalCategory` array member MUST be `{ name (string), icon (image), summary (string/text tagline), stats: impactStat[] }`, where `impactStat` is `{ value (string), label (string/text) }` and a category holds exactly **3** stats (validated to the design count). Display order is array order; no `order` field.
- FR-023: The hive-specific `backgroundColor`, the `heading`/`content` icon-or-text duality, and all `order` fields MUST NOT be carried over. Existing **icon image assets** MUST be reused (re-reference, do not re-upload).
- FR-024: Existing content MUST be migrated **once** into the singleton: 3 carbon tabs × 5 paired metrics, and 4 environmental categories × (icon + summary + 3 stats). Carbon `value` strings MUST be authored per the new mockups; icon↔metric pairing MUST follow the mockup's left-to-right order (coal, forest, oil, smartphone, recycle). All authored text (values, labels, category names, summaries) MUST match the mockups exactly — sentence-case summaries, the corrected "generating" wording, and the `WATER CONSERVATION` label — with editors free to revise later in the CMS.
- FR-025: After migration and frontend cutover, the orphaned standalone document types (`impact`, `carbonoffsets`, `carbonoffsetstabs`, `carbonoffsetsHexagon`) MUST be removed from the schema, the desk structure, and `presentation/resolve.ts`; the new singleton MUST be added to `presentation/resolve.ts` (location → `/impact`).
- FR-026: `sanity.types.ts` MUST be regenerated locally (`pnpm run sanity:typegen`) and the updated `sanity.schema.json` committed.

### Functional Requirements — Frontend Data Wiring

- FR-030: The `app/[slug]/page.tsx` dispatcher's `case 'Impact'` MUST fetch the **single** Impact-content singleton by id (one query) instead of the two global `*[_type==…]` fetches, and pass its `carbonOffsetTabs` / `environmentalCategories` to the `Impact` component.
- FR-031: The old `impactItemsQuery` and `carbonoffsetsQuery` MUST be replaced by a single singleton query in `sanity/lib/queries.ts`.
- FR-032: The `page` document remains the routable entity (slug, SEO, Heading, background, `contentType` → Impact); routing and `generateStaticParams` are unchanged. (Editors therefore touch 2 documents — the page for chrome, the singleton for sections — down from 8.)
- FR-033: The Impact `page` document's `background`/`backgroundColor` values MUST be cleared, and the new section components MUST render with transparent backgrounds, so the site's default (white) background shows through — matching the mockups. The `background` field is retained in the schema for future use.

### Functional Requirements — Cleanup

- FR-040: The hive frontend code MUST be removed: the clip-path hexagon layout (`ImpactHexagons`), the `hexagonGridItem` utility, and the icon-OR-text (`getHexagonContent`) logic.
- FR-041: Hive-named components/queries MUST be renamed to reflect the new model (no "hexagon" naming in the new code).

### Non-Functional Requirements

- NFR-001: Interactions MUST feel smooth (target ~60fps) with no jarring layout shift during enter/exit.
- NFR-002: All interactive components MUST be Client Components (`'use client'`) — required for React hooks and framer-motion (this codebase styles with Tailwind, not styled-components).
- NFR-003: No new animation/runtime dependency — reuse the installed `framer-motion@12`.
- NFR-004: The Turbopack production build MUST pass without a custom webpack config and without `--webpack`.
- NFR-005: Tabs and icons MUST be keyboard-operable with appropriate selected/active ARIA state, and MUST respect `prefers-reduced-motion` (reduced/no bounce when set).
- NFR-006: Rendering MUST be defensive against a missing/empty singleton or empty arrays (the page must not crash if the singleton is absent during/after migration).

## Proposed Approach

Two workstreams — a CMS consolidation and a frontend rebuild — sequenced so the live page never reads data that isn't there.

**CMS (sibling `bluepath-sanity` Studio).** Author the singleton type and its inline object types (`carbonOffsetTab` → `carbonOffsetMetric`; `environmentalCategory` → `impactStat`). Surface it as a single-document desk entry (mirroring `homevideo`/`siteSettings`) and add it to `presentation/resolve.ts`. The `page` schema and the `contentType` router are untouched.

**Migration (one-time).** Create the singleton document and populate both arrays from the existing 7 documents, **reusing the existing icon asset references**. Carbon metrics are paired and ordered per the mockups, with `value` strings authored to match the mockups; environmental categories map cleanly from the current fields (`content1`→summary; `(contentheading2,content2)`/`(contentheading3,content3)`/`(contentheading4,content4)`→the 3 stats). A script can pre-fill values/labels, but **icon↔metric pairing requires human confirmation** (there is no stored link). Manual entry in the Studio is an acceptable alternative given the small volume (15 metrics + 4 categories).

**Frontend.** Replace the two global queries with one singleton query in `sanity/lib/queries.ts`; update the dispatcher's `case 'Impact'` to fetch it. Build the new Carbon Offsets component (fixed icon row + tab-swapped value/label) and the new Environmental Impact component (grid → promote-and-reveal state machine). Reuse `Impact.tsx` orchestration, the page-shell wiring, the tab-state pattern, and existing framer-motion conventions.

**Sequencing (critical).** (1) Add the singleton type and populate it while the old documents/types still exist. (2) Verify the new singleton renders correctly in Presentation/preview. (3) Cut the dispatcher + components over to the singleton. (4) Remove the old document types, desk entries, locations, queries, and hive code. This avoids any window where `/impact` reads a field that doesn't exist yet.

## User Stories

### Story 1: Compare carbon-offset equivalencies across lifecycle horizons

**As a** prospective partner reading the Impact page
**I want to** switch between PROJECT LIFE, USEFUL LIFE, and AS OF TODAY
**So that** I can see how each offset metric changes across time horizons without losing the icon context

**Acceptance Criteria:**

- [ ] Given the Carbon Offsets section on load, when the page renders, then the 5 icons appear in a fixed row with the first tab's values beneath them.
- [ ] Given a different tab is clicked, when it activates, then only the values/labels beneath the (unmoving) icons change, with a fade + bounce.

### Story 2: Drill into a single environmental impact category

**As a** visitor scanning Environmental Impact
**I want to** click a category icon and see its detailed stats
**So that** I can focus on one category's numbers at a time

**Acceptance Criteria:**

- [ ] Given the 4-icon grid, when I click an icon (or its tab label), then that icon slides to the lead position, the other 3 icons leave, and 3 stats + a summary line animate in.
- [ ] Given a category is open, when I click a different tab label, then the content cross-fades to that category.
- [ ] Given a category is open, when I click the visible (active) icon, then the view collapses back to the 4-icon grid.

### Story 3: Edit all Impact content in one place

**As a** content editor
**I want** every Carbon Offset and Environmental Impact value in a single form with drag-to-reorder
**So that** I'm not hunting across seven documents or hand-managing order numbers

**Acceptance Criteria:**

- [ ] Given the Studio, when I open the Impact Page Content singleton, then I see both arrays inline and can reorder metrics/categories by dragging.
- [ ] Given Presentation mode on `/impact`, when I click a rendered value, then I land on that field inside the singleton.

### Story 4: Use the page on a phone

**As a** mobile visitor
**I want** the icons and data to stack legibly in a narrow viewport
**So that** the redesign is usable without horizontal scrolling of content

**Acceptance Criteria:**

- [ ] Given a mobile viewport, when Carbon Offsets renders, then icons lay out 2-per-row with value/label beneath each and tabs above.
- [ ] Given a mobile viewport, when an Environmental Impact category is selected, then the icon sits on top with its stats stacked vertically below it.

## Technical Constraints

- Next.js 16 (App Router). Data is fetched server-side via `sanityFetch` in the `app/[slug]/page.tsx` dispatcher under `contentType.name === 'Impact'`; the new singleton query lives in `sanity/lib/queries.ts`.
- Sanity project `qwwmf79r`, dataset `production`. Schema changes are authored in the sibling `bluepath-sanity` Studio. `sanity.types.ts` is generated/gitignored; `sanity.schema.json` is committed and MUST be regenerated via `pnpm run sanity:typegen` after schema changes.
- The singleton MUST follow the existing singleton convention (fixed `documentId`, single-document desk entry, hidden from the auto type list) as already used for `homevideo` and `siteSettings`.
- Visual editing already works (stega on the Impact fetches, `studioUrl` set, `<VisualEditing />` mounted, Presentation `defineLocations`); the new query MUST remain stega-enabled and the singleton MUST be added to `defineLocations`.
- Animation library is the installed `framer-motion@12` (the "motion" library referenced in the rough plan) — no new dependency.
- Styling is Tailwind CSS; interactive components must carry `'use client'`.
- Build is Turbopack (Next 16 default); no custom webpack config.

## Scope Boundaries

### What This Is NOT

- NOT a change to the `page` schema or the `contentType` router — routing, slugs, SEO, Heading, and background stay on the `page` document. (Conditional fields on the shared `page` type were explicitly rejected; see Alternatives.)
- NOT a generic page-builder/sections refactor for the whole site — the singleton is specific to the Impact page, consistent with the existing bespoke-template + singleton patterns.
- NOT the "Landing" page or the logo redesign that share the source deck — this spec covers the **Impact page** only.
- NOT adding new metrics or categories — 5 carbon icons and 4 environmental categories remain the set.
- NOT a new animation framework, a number-humanizing engine, or any reuse of this content across other pages.
- NOT a rewrite "from scratch" — the page-shell wiring, dispatcher pattern, `Impact.tsx` orchestration, tab-state pattern, and motion conventions are reused.

### Assumptions

- There is exactly one Impact page (singleton content is a 1:1 fit); the content is not reused elsewhere and is not independently published.
- Existing icon image assets are reused by reference; only pairing/ordering and surrounding value/label/summary data are restructured.
- Editors (or a one-time script with human-confirmed icon pairing) perform the migration; authored carbon values follow the new mockups.
- framer-motion 12 remains the project's motion library for the life of this work.
- The Impact sections render transparent over the site's default (white) background; the page's background value is cleared (the field is retained for future use).

## Critical Review

### Why This Approach

- A single singleton with inline arrays is a strictly better data model than the current global-singleton-by-`_type` design: it gives the icon↔value↔label pairing a home, replaces brittle `order` numbers with drag-to-reorder, and unifies editing into one form where click-to-edit already lands.
- Migrating both sections at once avoids the expensive mistake of restructuring Carbon Offsets now and re-migrating into the page later. The marginal cost of folding in Environmental Impact (a clean field mapping) is small relative to doing two migrations.
- Keeping the `page` document as the routable entity preserves the existing routing/dispatcher and avoids touching every other page — far less invasive than conditional fields on the shared `page` type.
- Reusing the page-shell, orchestration, and motion patterns keeps the frontend diff focused on what actually changes.

### Weak Spots / Trade-offs

- This pulls Environmental Impact — which needed **no** change for the visual redesign — into the migration blast radius. That's a deliberate cost paid for the editorial/architecture win.
- The whole Impact section now depends on one singleton document; if it's missing or empty, both sections are affected (mitigated by defensive rendering and seed-before-cutover).
- Icon↔metric pairing in the carbon migration is partly manual (no stored link), so it needs human verification against the mockups.
- Cross-repo coordination (Studio schema + committed `sanity.schema.json` + frontend query + desk + locations) is broader than a frontend-only change and must be sequenced carefully.
- Editors still open 2 documents (page chrome + sections singleton), not 1 — an honest limitation of keeping `page` as the router. Still a large improvement over 8.

## Alternatives Considered

### Keep the 7 standalone documents, refactor fields in place

- **Description**: Clean carbon metric type, keep separate `impact` docs, lean on existing Presentation/stega click-through. Environmental Impact stays zero-change.
- **Why rejected**: Lower risk but leaves content fragmented across 7 docs with manual `order` fields, and would force a second migration if the singleton is adopted later. The team chose to consolidate now and migrate once.

### Conditional fields on the shared `page` document (keyed off the contentType reference)

- **Description**: Add Impact-only arrays to `page`, shown only when `contentType.name === 'Impact'`.
- **Why rejected**: `contentType` is a **reference**, so Sanity `hidden`/`readOnly` callbacks can't branch on its resolved `name` without converting it to a string enum (a change rippling through every page and the dispatcher) or a custom async input. It also pollutes the `page` type used by all pages. High friction, low payoff versus a dedicated singleton.

### Frontend zips icons to numbers by index (no data change)

- **Description**: Pair the 5 icons to the 5 numbers by relative order at render time.
- **Why rejected**: The stored order doesn't align (two icon cells sit back-to-back), correspondence isn't guaranteed across tabs, and any editor reorder silently breaks it.

### Keep all 4 Environmental Impact icons visible (no slide)

- **Description**: Clicking an icon just reveals its stats below the full grid.
- **Why rejected**: Contradicts the mockups, which explicitly promote the selected icon and remove the others.

### Full bespoke `/impact` route replacing the `page` document

- **Description**: Move slug/SEO/Heading into the singleton and serve `/impact` from a dedicated route reading only the singleton (true single-document editing).
- **Why rejected**: Diverges from the uniform `[slug]` + `contentType` routing and `generateStaticParams`; not worth the disruption to collapse 2 docs into 1.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Singleton missing/empty blanks both sections | Med | High | Seed and verify the singleton before cutover; render defensively (NFR-006); keep old data until the new page renders in preview. |
| Icon↔metric mispairing during migration | Med | High | Pair against the mockup order (coal, forest, oil, smartphone, recycle); visually verify each tab post-migration. |
| Deploy sequencing reads a not-yet-present field | Med | High | Populate singleton first, cut frontend over, then delete old types/queries/code. |
| Env Impact dragged into migration introduces a regression in a previously-stable section | Med | Med | Field mapping is mechanical and 1:1; verify all 4 categories' 3 stats + summary render against current production values. |
| Stored figures differ from mockup (e.g. oil `9,550,643` vs `9.6 Million`) | High | Low | `value` is an editor-authored display string; adopt mockup figures at migration time (confirm exact figures — see Open Questions). |
| `sanity.schema.json` not regenerated/committed → CI typegen drift | Med | Med | Run `pnpm run sanity:typegen` and commit the updated `sanity.schema.json` with the schema change. |
| Bounce animations ignore reduced-motion / hurt a11y | Med | Med | Gate motion on `prefers-reduced-motion`; ensure tabs/icons are focusable with proper ARIA selected state. |

## Acceptance Criteria

- [ ] Carbon Offsets renders 3 tabs over a fixed 5-icon row; switching a tab swaps only the value/label beneath each icon, with fade + bounce, icons unmoving.
- [ ] Environmental Impact loads as a 4-icon grid with no selection; selecting promotes the icon to the lead, removes the other 3, and animates in 3 stats + summary; clicking the active icon collapses back; switching tabs cross-fades.
- [ ] Environmental Impact stat numbers display with thousands separators.
- [ ] Mobile: Carbon Offsets icons render 2-per-row with value/label beneath and tabs above; Environmental Impact open state stacks icon-over-stats vertically.
- [ ] All Impact section content is served from a single singleton query; the dispatcher no longer issues the two global `*[_type==…]` fetches.
- [ ] The Studio shows one Impact Page Content singleton with both arrays inline, drag-to-reorder, and no manual `order` fields; click-to-edit on `/impact` lands inside it.
- [ ] All three carbon tabs and all four environmental categories display correct, mockup-aligned content; existing icon assets are reused.
- [ ] The old `impact`, `carbonoffsets`, `carbonoffsetstabs`, `carbonoffsetsHexagon` types are removed from schema, desk, and `presentation/resolve.ts`; the singleton is added to locations.
- [ ] `sanity.schema.json` is regenerated and committed; the Turbopack build passes without `--webpack`.
- [ ] The hive frontend code (`ImpactHexagons`, `hexagonGridItem`, `getHexagonContent`) is deleted and no "hexagon" naming remains in the new code.
- [ ] Interactions respect `prefers-reduced-motion` and are keyboard-operable.

## Open Questions

None — all prior open questions are resolved (see Resolved Decisions).

## Resolved Decisions

- **Carbon load state:** first tab (PROJECT LIFE) active with values shown on load. (FR-006)
- **Number fidelity:** author `value` strings to match the mockups; editors adjust in the CMS as needed. (FR-024)
- **Migration text:** match the mockups exactly (sentence-case summaries, corrected "generating", `WATER CONSERVATION` label); editors can revise later. (FR-024)
- **Singleton scope:** Heading/background/SEO stay on the `page` document; the singleton is content-only. Revisit later. (FR-032)
- **Page background:** clear the Impact page's background value and render sections transparent over the site's (white) background; keep the field for future use. (FR-033)
- **Counts:** model and validate to the design — exactly 5 carbon metrics per tab, 3 stats per category. (FR-021, FR-022)

## Blockers

- None. This spec is ready for implementation.
