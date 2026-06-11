# Tasks: Impact Page Redesign (Carbon Offsets + Environmental Impact)

**Source spec**: ./spec.md
**Generated**: 2026-06-08

> Cross-repo feature. Paths are relative to the repo root they live in:
> `bluepath-sanity/…` (Studio: schemas, desk, presentation) and
> `bluepath-frontend-ts/…` (Next.js site). The two repos are siblings under
> `/Users/jullweber/Sites/bluepath/`.

## Checkbox Legend

- `- [ ]` — Not started
- `- [x]` — Completed
- `- [~]` — Blocked / needs external input
- `- [!]` — Failed / needs manual intervention

## Phase 1: Setup

Confirm the runtime, then gather the migration source-of-truth from the
mockups. No story labels.

- [x] T001 [P] Confirm `framer-motion@12` is present and no new animation/runtime dependency is added in `bluepath-frontend-ts/package.json` (NFR-003)
- [x] T002 [P] Transcribe the mockups in `bluepath-frontend-ts/.claude/prompts/feat/impact-redesign/assets/` into a migration reference note at `bluepath-frontend-ts/.claude/prompts/feat/impact-redesign/migration-content.md`: the 3 carbon tabs (PROJECT LIFE / USEFUL LIFE / AS OF TODAY) × 5 value+label pairs in left-to-right icon order (coal, forest, oil, smartphone, recycle), and the 4 environmental categories (SOLAR PROJECTS / BUILDING ENERGY / WATER CONSERVATION / CO2 REDUCTION) with summary + 3 stats each — sentence-case summaries, corrected "generating" wording, exact `WATER CONSERVATION` label (supports FR-024)
- [x] T003 Query the existing `impact` and `carbonoffsets` documents in Sanity dataset `production` and record each reusable icon asset `_ref`/`_id` in the migration note, mapped to its target metric/category (FR-023, FR-024)

## Phase 2: Foundational

The single Impact-content singleton plus its query and regenerated types — the
shared substrate every story sits on. Per the spec's critical sequencing, the
singleton is authored and **seeded before any frontend cutover**, while the old
documents/types still exist. No story labels.

- [x] T004 [P] Create the `carbonOffsetMetric` object type in `bluepath-sanity/schemas/carbonOffsetMetric.ts` — `{ icon (image), value (string display value), label (text) }`; no `order`, no `backgroundColor` (FR-021, FR-023)
- [x] T005 [P] Create the `impactStat` object type in `bluepath-sanity/schemas/impactStat.ts` — `{ value (string), label (text) }` (FR-022, FR-023)
- [x] T006 Create the `carbonOffsetTab` object type in `bluepath-sanity/schemas/carbonOffsetTab.ts` — `{ name (string, tab label), metrics: carbonOffsetMetric[] }` validated to exactly 5 metrics; display order = array order (FR-021)
- [x] T007 Create the `environmentalCategory` object type in `bluepath-sanity/schemas/environmentalCategory.ts` — `{ name (string), icon (image), summary (text), stats: impactStat[] }` validated to exactly 3 stats; display order = array order (FR-022)
- [x] T008 Create the `impactPageContent` singleton document type in `bluepath-sanity/schemas/impactPageContent.ts` with inline arrays `carbonOffsetTabs: carbonOffsetTab[]` and `environmentalCategories: environmentalCategory[]`; no `order` fields, no heading/content duality (FR-020, FR-023)
- [x] T009 Register the 5 new types in `bluepath-sanity/schemas/schema.ts` (FR-020)
- [x] T010 Add a single-document desk entry for the singleton (`S.document().schemaType('impactPageContent').documentId('impactPageContent')`, mirroring `homevideo`/`siteSettings`) and add `'impactPageContent'` to `HIDDEN_FROM_AUTO_LIST` in `bluepath-sanity/sidebar.tsx` (FR-020)
- [~] T011 Create and populate the singleton document (fixed id `impactPageContent`) in dataset `production` from the migration note, **re-referencing the existing icon assets** (do not re-upload): 3 tabs × 5 paired metrics in mockup order, 4 categories × (icon + summary + 3 stats). Use a one-time script under `bluepath-sanity/` (e.g. via the Sanity client/MCP) or Studio manual entry; human-confirm each icon↔metric pairing against the mockups (FR-024, FR-023)
  - User-authorized, but BLOCKED on write creds: the Sanity MCP token is read-only (`Insufficient permissions; permission "create" required`) and the CLI session is stale. Delivered an idempotent seed script `bluepath-sanity/scripts/seedImpactPageContent.ts` (createOrReplace) that performs the seed. RUN: `sanity login` then `pnpm --dir bluepath-sanity exec sanity exec scripts/seedImpactPageContent.ts --with-user-token`. Icon pairing + AS-OF-TODAY values confirmed "use as-is" by the user.
- [~] T012 Clear the Impact `page` document's `background`/`backgroundColor`/`mobilebackground` values in dataset `production` (leave the fields in the `page` schema) so the redesigned sections show over the site's white background (FR-033)
  - User-authorized, BLOCKED on write creds (same as T011). Handled by the same script `bluepath-sanity/scripts/seedImpactPageContent.ts`, which unsets `background`/`mobilebackground`/`backgroundColor` on the Impact page (`c537374f-f05f-4f53-9127-65d9d39eeefe`). Frontend already renders transparently, so this is cosmetic cleanup of the stored bg.
- [x] T013 Add `impactPageContentQuery` to `bluepath-frontend-ts/sanity/lib/queries.ts` — a single `defineQuery` fetching the singleton by id (`*[_id == "impactPageContent"][0]`), stega-enabled (no `stega: false`), projecting `carbonOffsetTabs[]{ name, metrics[]{ value, label, icon{…imageFields} } }` and `environmentalCategories[]{ name, summary, icon{…imageFields}, stats[]{ value, label } }` (FR-031, FR-030, FR-041, NFR-006)
- [x] T014 Regenerate types: run `pnpm run sanity:typegen` from `bluepath-frontend-ts` and commit the updated `bluepath-frontend-ts/sanity.schema.json` (generated `sanity.types.ts` stays gitignored) (FR-026) — typegen run (23 queries, `ImpactPageContentQueryResult` emitted); `sanity.schema.json` regenerated, commit pending final group commit
- [~] T015 Sequencing gate — verify the seeded singleton is complete and mockup-aligned before any frontend cutover: query it via Sanity Vision in dataset `production` and confirm 3 tabs × 5 paired metrics, 4 categories × 3 stats + summary, and that every icon asset reference resolves (mitigates "singleton missing/empty" + "icon mispairing" risks)
  - BLOCKED: depends on T011 seed (production write awaiting authorization). Re-run once seeded.

## Phase 3: User Story 1 — Compare carbon-offset equivalencies across lifecycle horizons

**Goal**: Switch PROJECT LIFE / USEFUL LIFE / AS OF TODAY over a fixed row of 5 icons, swapping only the value/label beneath each unmoving icon.

**Independent test criteria** (from Story 1 Acceptance Criteria):

- On load, the 5 icons appear in a fixed row with the first tab's (PROJECT LIFE) values beneath them.
- Clicking a different tab changes only the values/labels beneath the (unmoving) icons, with a fade + bounce.

> The dispatcher + `Impact.tsx` cutover (T019–T020) is the **atomic seam** that
> swaps both sections from the old global queries to the singleton in one move.
> It renders the new Environmental component (US2) too, so it requires
> T021–T024 to exist before it lands. See Dependencies / Implementation Strategy.

- [x] T016 [US1] Create the `CarbonOffsets` client component (`'use client'`) in `bluepath-frontend-ts/components/CarbonOffsets.tsx`: a fixed horizontal row of 5 metric icons that never moves across tab changes, plus the 3 lifecycle tabs from `carbonOffsetTabs`; first tab active on load; tabs keyboard-operable with `aria-selected`/active state (FR-001, FR-002, FR-006, NFR-002, NFR-005)
- [x] T017 [US1] Render each metric's `value` (large) + `label` (small) beneath its fixed icon for the active tab; a tab switch swaps all 5 value/label pairs while icons stay fixed; render defensively when arrays are empty/absent, in `bluepath-frontend-ts/components/CarbonOffsets.tsx` (FR-003, FR-004, NFR-006)
- [x] T018 [US1] Animate the value/label text on tab switch with a framer-motion fade + bounce, gated on `prefers-reduced-motion` (reduced/no bounce when set), in `bluepath-frontend-ts/components/CarbonOffsets.tsx` (FR-005, NFR-005, NFR-001)
- [x] T019 [US1] Rewrite `bluepath-frontend-ts/components/Impact.tsx` to accept the singleton (`carbonOffsetTabs` / `environmentalCategories`) instead of `impactItems`/`carbonoffsets`, render transparently (no background image/color; keep the page `Heading`), render `CarbonOffsets` and `EnvironmentalImpact`, and guard against a missing/empty singleton (FR-033, FR-030, NFR-006)
- [x] T020 [US1] Cut over the `case 'Impact'` branch in `bluepath-frontend-ts/app/[slug]/page.tsx` to a single `sanityFetch({ query: impactPageContentQuery })` (replacing the two `Promise.all` global fetches) and pass the result to `Impact`; leave routing and `generateStaticParams` untouched (FR-030, FR-032)

## Phase 4: User Story 2 — Drill into a single environmental impact category

**Goal**: Click a category icon (or its tab) to promote it to the lead position and reveal its 3 stats + summary; switch or collapse from there.

**Independent test criteria** (from Story 2 Acceptance Criteria):

- Clicking an icon (or its tab label) slides it to the lead, the other 3 icons leave, and 3 stats + a summary line animate in.
- Clicking a different tab label while open cross-fades the content to that category.
- Clicking the visible (active) icon collapses back to the 4-icon grid.

- [x] T021 [US2] Create the `EnvironmentalImpact` client component (`'use client'`) in `bluepath-frontend-ts/components/EnvironmentalImpact.tsx`: initial state is the 4 category icons in a row with the 4 tab labels above and **no selection**; icons and tab labels keyboard-operable with ARIA active state (FR-010, NFR-002, NFR-005)
- [x] T022 [US2] Implement the select-and-reveal state machine in `bluepath-frontend-ts/components/EnvironmentalImpact.tsx`: selecting (icon or tab) promotes the chosen icon to the leftmost position, exits the other 3, reveals its 3 stats + summary to the right; the active tab is highlighted while the others stay visible/clickable; switching while open cross-fades to the new category; clicking the active icon collapses back to the grid (FR-011, FR-012, FR-013, FR-014)
- [x] T023 [US2] Add framer-motion enter/exit fade + bounce (stats permitted to stagger), gated on `prefers-reduced-motion`, in `bluepath-frontend-ts/components/EnvironmentalImpact.tsx` (FR-015, NFR-005, NFR-001)
- [x] T024 [US2] Render stat values with thousands separators (reuse `bluepath-frontend-ts/utils/formatNumber.ts`) unless the migrated value already contains separators/non-numeric text; render defensively for empty stats/categories, in `bluepath-frontend-ts/components/EnvironmentalImpact.tsx` (FR-016, NFR-006)

## Phase 5: User Story 3 — Edit all Impact content in one place

**Goal**: Every Carbon Offset and Environmental Impact value lives in one singleton form with drag-to-reorder, and click-to-edit on `/impact` lands inside it.

**Independent test criteria** (from Story 3 Acceptance Criteria):

- The Studio shows one Impact Page Content singleton with both arrays inline and metrics/categories reorderable by dragging.
- Clicking a rendered value in Presentation mode on `/impact` lands on that field inside the singleton.

- [x] T025 [US3] Add `impactPageContent` to `defineLocations` in `bluepath-sanity/presentation/resolve.ts` (location → `/impact`, title "Impact") (FR-025)
- [x] T026 [US3] Confirm `impactPageContentQuery` and the dispatcher fetch keep stega enabled (no `stega: false`) so click-to-edit resolves, in `bluepath-frontend-ts/sanity/lib/queries.ts` and `bluepath-frontend-ts/app/[slug]/page.tsx` — verified: query has no `stega: false`; the only `stega: false` calls are in `generateStaticParams`/`generateMetadata`, not the Impact dispatch fetch
- [x] T027 [US3] Verify in the Studio that `bluepath-sanity/schemas/impactPageContent.ts` renders both arrays inline with drag-to-reorder and that no manual `order` field exists anywhere in the new types — schema-verified: both `carbonOffsetTabs`/`environmentalCategories` are inline arrays-of-objects (Sanity drag-reorders these by default); no `order` field in any of the 5 new types (only the word "order" in field descriptions). Visual Studio confirmation still recommended once running.
- [~] T028 [US3] Verify the Presentation round-trip: clicking a rendered carbon value/label and an environmental stat/summary on `/impact` lands on the corresponding field inside the singleton
  - BLOCKED: requires the seeded singleton (T011) + running Studio/preview — manual browser verification after authorization.

## Phase 6: User Story 4 — Use the page on a phone

**Goal**: Icons and data stack legibly in a narrow viewport with no horizontal scrolling of content.

**Independent test criteria** (from Story 4 Acceptance Criteria):

- Carbon Offsets renders icons 2-per-row with value/label beneath each and tabs above.
- Selecting an Environmental Impact category shows the icon on top with its stats stacked vertically below.

- [x] T029 [US4] Add the mobile layout for Carbon Offsets in `bluepath-frontend-ts/components/CarbonOffsets.tsx`: 5 icons in a 2-column grid, each with its value/label beneath, tabs rendered above (FR-007) — `grid-cols-2 tablet:grid-cols-5`; tab row (`flex-wrap`) above the panel
- [x] T030 [US4] Add the mobile layout for Environmental Impact in `bluepath-frontend-ts/components/EnvironmentalImpact.tsx`: collapsed state is a 2-column icon grid, tab labels render as a horizontal row/scroll, open state stacks the selected icon on top with stats vertically below (FR-017) — collapsed `grid-cols-2 tablet:grid-cols-4`; tab labels `flex-wrap` row; open outer `flex-col tablet:flex-row` (icon on top, stats stacked) and stats `flex-col tablet:flex-row`
- [~] T031 [US4] Verify both sections on a mobile viewport: no horizontal scrolling of content and no jarring layout shift during enter/exit (NFR-001)
  - BLOCKED: requires the seeded singleton (components render null when empty) + a mobile browser session. Static review: content is `max-w-5xl` + `px-4`, grids wrap, labels `max-w-[Nch]` — no fixed-width overflow expected. Confirm in-browser after seed.

## Final Phase: Polish / Cleanup

Remove the hive code and the orphaned document types **after** the new page is
verified in preview (sequencing step 4), then regenerate types and prove the
build. No story labels.

- [x] T032 Remove `impactItemsQuery` and `carbonoffsetsQuery` from `bluepath-frontend-ts/sanity/lib/queries.ts` (FR-031)
- [x] T033 Delete the hive frontend code — `bluepath-frontend-ts/components/ImpactHexagons.tsx`, `bluepath-frontend-ts/components/ImpactThumb.tsx`, `bluepath-frontend-ts/components/ImpactContent.tsx`, and `bluepath-frontend-ts/utils/hexagonGridItem.ts` (removing the `getHexagonContent` icon-or-text logic with it); confirm no "hexagon" naming remains in the new code (FR-040, FR-041)
- [x] T034 Remove the imports and `schemaTypes` registrations for `impact`, `carbonoffsets`, `carbonoffsetstabs`, `carbonoffsetsHexagon` from `bluepath-sanity/schemas/schema.ts` and delete `bluepath-sanity/schemas/impact.ts`, `bluepath-sanity/schemas/carbonoffsets.ts`, `bluepath-sanity/schemas/carbonOffsetsTabs.ts`, `bluepath-sanity/schemas/carbonOffsetHexagon.ts` (FR-025)
- [x] T035 Remove the old "Impact" and "Carbon Offsets Data" desk entries and their ids (`impact`, `carbonoffsets`, `carbonoffsetstabs`, `carbonoffsetsHexagon`) from `HIDDEN_FROM_AUTO_LIST` in `bluepath-sanity/sidebar.tsx` (FR-025)
- [x] T036 Remove the `impact`, `carbonoffsets`, `carbonoffsetstabs`, `carbonoffsetsHexagon` locations from `bluepath-sanity/presentation/resolve.ts` (FR-025)
- [~] T037 After cutover is verified, delete the orphaned `impact`/`carbonoffsets`/`carbonoffsetstabs`/`carbonoffsetsHexagon` documents from dataset `production` (icon assets are now referenced by the singleton, so they are retained) (FR-025)
  - BLOCKED: production-dataset delete — needs explicit user authorization AND must run only after the seeded singleton renders correctly in preview. Old doc IDs recorded in migration-content.md.
- [x] T038 Regenerate types after the schema removals: run `pnpm run sanity:typegen` from `bluepath-frontend-ts` and commit the updated `bluepath-frontend-ts/sanity.schema.json` (FR-026) — typegen re-run (21 queries, 45 schema types); `sanity.schema.json` regenerated, commit pending final group commit
- [x] T039 Run `pnpm run typecheck` in `bluepath-frontend-ts` and fix any fallout from the new types / removed queries — passes clean (`tsc --noEmit`, no errors)
- [x] T040 Verify the Turbopack production build passes without a custom webpack config and without `--webpack`: `pnpm run build` in `bluepath-frontend-ts` (NFR-004) — `pnpm run build` succeeded, 47 pages generated; `/[slug]` (incl. impact) prerenders with the unseeded singleton without crashing (NFR-006 confirmed)
- [x] T041 Final accessibility/motion pass across `CarbonOffsets.tsx` and `EnvironmentalImpact.tsx`: keyboard operability, correct ARIA selected/active state, and `prefers-reduced-motion` honored end-to-end (NFR-005, NFR-001) — Carbon: tablist/tab/tabpanel + `aria-selected` + roving tabindex + arrow-key nav. Environmental: category labels are `aria-pressed` toggles in a `role="group"` (fixed from a misleading tablist after verification-agent review), icon buttons carry `aria-expanded` + labels. All motion (layout/layoutId, spring, stagger, travel) gated on `useReducedMotion()`. Verification agent cleared types, GROQ↔component field match, dangling refs, and defensive rendering.

## Dependencies

- **Phase 1 (Setup)** feeds Phase 2: T002/T003 produce the content + icon refs that T011 seeds.
- **Phase 2 (Foundational) blocks all story phases.** Nothing frontend can render until the singleton is seeded (T011), types are regenerated (T014), and the query exists (T013). T015 is a hard gate before any cutover.
- **Within Phase 2**: T004/T005 (leaf object types) → T006/T007 (tabs/categories that contain them) → T008 (singleton) → T009 (register) → T010 (desk). T011 (seed) needs T008–T010 + T002/T003. T013 (query) needs T008. T014 (typegen) needs T009 + T013. T015 needs T011.
- **US1 components (T016–T018)** depend only on Phase 2 and are independent of US2.
- **US2 (T021–T024)** depends only on Phase 2 and is independent of the US1 components — **but** the cutover (T019–T020) renders the US2 component, so T019–T020 require T021–T024 to be done. The cutover is atomic: it swaps both sections to the singleton in one step.
- **US3 (T025–T028)**: T025/T026 can land with Phase 2; T028 (click-to-edit round-trip) requires the cutover (T019–T020). T027 requires only the schema (T008).
- **US4 (T029–T031)** modifies the US1/US2 components and must follow T016–T024.
- **Polish/Cleanup (T032–T041)** runs last — only after the new page renders correctly in preview (sequencing step 4). T032/T033 (frontend) need the cutover done; T034–T037 (Studio) need the cutover verified; T038 follows T034; T039/T040 follow all removals.

## Parallel Opportunities

- T001 || T002 (different concerns; both Setup).
- T004 || T005 (independent leaf object types in different files).
- US1 component work (T016–T018) || US2 component work (T021–T024) — different files, both prop-driven, both gated only on Phase 2. They converge at the cutover (T019–T020).
- T025 (Studio locations) can proceed in parallel with US1/US2 component builds.

## Implementation Strategy

**MVP scope**: Phase 2 (Foundational) + **US1 and US2 together**. Because one
singleton query feeds one `Impact.tsx` container, the dispatcher cutover
(T019–T020) swaps both sections atomically — there is no "carbon-only" ship that
leaves the Environmental section working. The smallest correct increment is the
whole redesigned page reading from the singleton. (US1's component is still
built and verifiable on its own; it just becomes user-visible at the shared
cutover.)

**Ship order**:

1. Phase 1 (Setup) + Phase 2 (Foundational) — author + seed + verify the singleton while the old data still exists. **Do not proceed past T015 until the seed is verified.**
2. US1 components (T016–T018) and US2 (T021–T024) in parallel.
3. Cutover (T019–T020) → the redesigned `/impact` is live from the singleton. Verify in preview.
4. US3 (T025–T028) — confirm the editorial round-trip (most of US3 is delivered by Phase 2; this verifies click-to-edit + drag-reorder).
5. US4 (T029–T031) — mobile layouts.
6. Polish / Cleanup (T032–T041) — delete the hive code + orphaned types, regenerate, prove the build.

## Coverage

Every Functional and Non-Functional Requirement maps to at least one task:

- FR-001 → T016
- FR-002 → T016
- FR-003 → T017
- FR-004 → T017
- FR-005 → T018
- FR-006 → T016
- FR-007 → T029
- FR-010 → T021
- FR-011 → T022
- FR-012 → T022
- FR-013 → T022
- FR-014 → T022
- FR-015 → T023
- FR-016 → T024
- FR-017 → T030
- FR-020 → T008, T009, T010
- FR-021 → T004, T006
- FR-022 → T005, T007
- FR-023 → T004, T005, T008, T011, T003
- FR-024 → T002, T003, T011
- FR-025 → T025, T034, T035, T036, T037
- FR-026 → T014, T038
- FR-030 → T013, T019, T020
- FR-031 → T013, T032
- FR-032 → T020
- FR-033 → T012, T019
- FR-040 → T033
- FR-041 → T013, T016, T021, T033
- NFR-001 → T018, T023, T031, T041
- NFR-002 → T016, T021
- NFR-003 → T001
- NFR-004 → T040
- NFR-005 → T016, T018, T021, T023, T041
- NFR-006 → T013, T017, T019, T024

## Open Questions

None — the spec resolved all open questions (see its "Resolved Decisions"). The
only judgement call carried into tasks is the **icon↔metric pairing** during the
seed (no stored link), which T011 resolves by human-confirming against the
mockups and T015 verifies.
