# Design Updates 2026 — Rough Plan

Source: [Monkey-Kode/bluepath-trackers#1](https://github.com/Monkey-Kode/bluepath-trackers/issues/1) ("April 2026 website updates — Brent Consulting scope") + design comps in `.claude/assets/`.

Stakeholders: Jocelyn Brent (scope owner), William Brent, Richard Bronshvag (Fika, design), Sarah Starbird (BluePath, billing).

## Priorities (per Jocelyn 2026-04-28)

1. **News & Events** — top priority, William has content waiting to publish.
2. Main Landing Page (below the hero video).
3. Leadership.
4. Project Submission page removal.

## Brand / global

- Fonts: **Lora** (serif headings) + **Inter** (sans body). Verify they're loaded once and used consistently. Remove old serif/sans pairs.
- Establish a basic Brand Style Guide (record fonts + propose 1–2 palette additions as work progresses).
- New listing pages move to **white background, BluePath-blue text** (existing site is dominantly blue-bg / white-text).

---

## 1. Sanity schema work — `bluepath-sanity/`

The current `event.ts` schema is the single source for both news and events on the site (see `bluepath-gatsby-ts/src/pages/events.tsx` querying `allSanityEvent`). It only has: `name`, `slug`, `eventAt`, `content` (block array), `image`, `description`. This is too thin for the new article template **and** mashes two distinct content shapes (a wordpress-style article vs an event with RSVP) into one document.

**Decision:** split into two document types now — `news` and `event` — each with the fields it actually needs. Existing `event.ts` becomes the leaner event-only schema; new `news.ts` is created for articles. **No data migration needed** — there is no existing news content; editors will populate `news` documents from scratch after the schema deploys. Existing `event` documents stay untouched.

### 1a. New document type — `news.ts`

Modeled after Richard's article spec (Image / Publication / Date / Headline / Subhead / Article) and the editorial layout in `news-single-page.jpg`:

- `title` — string (required). The article title.
- `slug` — slug (source: `headline`). URL slug; renders at `/news/:slug` (see §2b).
- `subhead` — string. Optional second line under the headline (e.g. "An Interview with Warren Jones, CEO of BluePath Finance").
- `publication` — string. Free-text label shown above the headline on the listing card (e.g. "PRESS RELEASE", "ENERGY CHANGEMAKERS").
- `publishedAt` — datetime (required). Drives the "April 22, 2026" stamp on listing + article and sort order.
- `heroImage` — image (hotspot). Visual at the top of the article and the thumbnail in the mixed listing.
- `excerpt` — text. ~1–3 sentence teaser shown on the listing card under the subhead.
- `body` — portable text. **Richer than the event body** — needs full editorial range: blocks with bold/italic, headings (H2/H3), bullet + numbered lists, inline links, blockquotes, bold inline callouts (e.g. "Why it matters:" / "The big picture:"), inline images with captions, pull quotes, and `youtube` embeds. Define an article-grade `block` array on this schema; do not reuse the trimmed event `content` shape.
- `seoDescription` — text. SEO-only, hidden from card UI.
- Studio: `orderings` by `publishedAt desc`; list `preview` shows title + publication + date; live Presentation preview pointing at `/news/:slug` (see §1d).

### 1b. Update `event.ts` — additive only

**Do not remove or rename any existing fields on `event.ts`.** The site is live and editors are using these fields; breaking changes here risk taking down content. This step is _additive only_ — only new optional fields, no field removals, no field renames, no `name → headline` flip. Form-handling flow stays exactly as today (Netlify Forms).

Existing fields (kept as-is): `name`, `slug`, `eventAt`, `content` (portable text body), `image`, `description`.

Optional new fields, only if a new comp element actually requires them:

- `publication` — string (optional). Small label e.g. "PHOENIX, AZ" shown above the headline on the event single page (`events-updated-single-page.jpg`). Skip if `description` or another existing field can carry this — prefer reusing what's already there.

If we can render the new event comp purely with existing fields, this section becomes a no-op on the schema and lives entirely in the Gatsby template.

Studio additions (no schema breaking changes):

- Add `orderings` by `eventAt desc`.
- Refine `preview` to show `name` + `eventAt` + (if added) `publication`.
- Add live Presentation preview pointing at `/events/:slug` (see §1d).

### 1c. Leadership / `team.ts`

- **No schema changes.** Leadership update is visual only — reuse existing `name`, `role`, `bio`, `image`, `order` fields.
- Studio: add live Presentation preview pointing at the Leadership page (see §1d).

### 1d. Studio Presentation / live preview

Wire up [Sanity Presentation](https://www.sanity.io/docs/content-lake/presenting-and-previewing-content) so editors can see their changes against the live Gatsby site from inside the Studio. Configure the `presentationTool` in `sanity.config.ts` with a `resolve.locations` map that returns the right URL for each document type. Per-type targets:

| Schema type            | Studio preview URL                                       |
| ---------------------- | -------------------------------------------------------- |
| `news`                 | `/news/:slug` (single post)                              |
| `event`                | `/events/:slug` (single event)                           |
| `page`                 | `/${slug}` for that page (caveat below)                  |
| `navigation`           | `/` (preview header on home so menu changes are visible) |
| `homevideo`            | `/`                                                      |
| `homesections`         | `/`                                                      |
| `carousel`             | `/`                                                      |
| `carouselLink`         | `/`                                                      |
| `casestudies`          | `/projects/`                                             |
| `team`                 | `/leadership`                                            |
| `impact`               | `/impact`                                                |
| `carbonoffsets`        | `/impact`                                                |
| `carbonoffsetstabs`    | `/impact`                                                |
| `carbonoffsetsHexagon` | `/impact`                                                |
| `address`              | `/connect` (contact page)                                |

Realism caveats:

- `page` is a mixed-field document (not a single WYSIWYG body), so the live preview will show the rendered route but won't be a true block-by-block in-place editor — that's expected, just point it at the page slug.
- `siteSettings` and `contentType` don't have a meaningful single-page preview — leave those without a Presentation target.

Implementation: add `@sanity/presentation` (already shipped with `sanity` v3.x), enable in config, set `previewUrl` to the Gatsby site (env-controlled — local dev URL vs production), and implement `resolve.locations` per the table above. Match the project ID/dataset already in use (`qwwmf79r` / `production`).

### 1e. Studio sidebar restructure — promote Case Studies

Today `casestudies` lives under the "Custom Content" group in `sidebar.tsx`. Move it out to be a **first-party top-level menu item** alongside Pages / Events / Navigation. Suggested order:

1. Pages
2. News (new)
3. Events
4. Case Studies (promoted out of Custom Content)
5. Navigation
6. (auto-listed remaining types)
7. Custom Content (Home Video, Home Carousel, Home Sections, Team Members, Impact, Carbon Offsets Data, Company Addresses)
8. Global Settings

Update `HIDDEN_FROM_AUTO_LIST` accordingly so `casestudies` doesn't appear twice, and remove the Case Studies entry from the Custom Content sublist.

---

## 2. Gatsby work — `bluepath-gatsby-ts/`

### Routing

- **`/news-and-events`** — mixed archive listing previews from both `allSanityNews` and `allSanityEvent`, sorted by date desc. Replaces the current `/events` page.
- **`/news/:slug`** — new news article template (wordpress-style post).
- **`/events/:slug`** — existing event template (visually updated, behavior preserved).
- Add redirects (`gatsby-node` `createRedirect` or `netlify.toml`) so the old `/events` archive URL goes to `/news-and-events`.
- Update header nav: "News & Events" links to `/news-and-events`.

### 2a. Mixed archive — new `src/pages/news-and-events.tsx` (PRIORITY)

Comp: `news-events-archive-page.jpg`.

- White background, blue serif (Lora) headlines, sans body — drop the current blue gradient.
- Query both `allSanityNews` and `allSanityEvent`, merge into a single list, sort by date desc (`news.publishedAt` and `event.eventAt`).
- Layout per row: left = thumbnail (`heroImage` for news, `image` for events); right = date, publication/location label (small italic caps), headline (large serif), subhead (news only), excerpt, then a CTA button:
  - News → `CONTINUE READING` linking to `/news/:slug` (orange on hover, per the design note).
  - Events → `VIEW EVENT DETAILS` linking to `/events/:slug`.
- Section title: "NEWS & EVENTS" (uppercase, blue, Lora).
- Retire the old `src/pages/events.tsx` once this ships.

### 2b. News article template — new `src/templates/NewsArticle.tsx`

Comp: `news-single-page.jpg`. **Distinct visual treatment from events** — this is a traditional wordpress-style post with a hero image and rich content building.

- Centered single-column article (~720px reading column).
- Top: BluePath logo (or scaled-down brand mark), then headline (Lora, large), then hero image (full column width), then date stamp.
- Body: portable text rendered with full editorial styling — bold inline callouts ("Why it matters:", "The big picture:"), bulleted lists, inline images, blockquotes, links, and embedded YouTube. This is where the Sanity portable-text serializers do real work; budget time for them.
- Wired up via `gatsby-node` `createPage` iterating `allSanityNews` at `/news/:slug`.

### 2c. Event template — update `src/templates/Event.tsx`

Comp: `events-updated-single-page.jpg`.

- Two-column on desktop: left = vertical badge image (`event.image`); right = date, location (caps, e.g. "PHOENIX, AZ"), headline (Lora), portable-text body, then RSVP form.
- **RSVP form: do not change form behavior.** Reuse the existing Netlify Forms wiring as it works today; only restyle the inputs and submit button to match the new comp (Name / Company / Title / Email / Preferred Meeting Day-Time, with the orange triangle + SUBMIT button).
- Keep `/events/:slug` route + `gatsby-node` page generation; just swap the template's visual layout.

### 2d. Leadership page

Comps: `leadership-updated.jpg`, `leadership-with-content-updated.jpg`. **Visual only — uses existing Sanity data (`team` document: `name`, `role`, `bio`, `image`).**

- Refresh typography (Lora names, Inter role caps), keep existing photos, side-rail "LEADERSHIP" label, blue header on white background.
- Click-through interaction per the "layout will change on photo or copy click" note: clicking a photo or name expands an inline bio panel using the existing `bio` field. Implement as a simple expanded row that pushes content down — no schema change needed.

### 2e. Home page — section below hero video

Comp: `home-first-section.jpg`. **Match the comp.** Final copy (per the comp):

> **BluePath Finance is a leading owner and operator of sustainable infrastructure**
>
> We supply capital to a variety of distributed energy projects, including distributed and community solar, behind-the-meter batteries, microgrids, and EV infrastructure.
>
> We also partner with market leading ESCOs, EPCs, developers, and similar engineering groups. Our channel partners source, construct, and maintain our projects, while BluePath funds, owns, and operates them.

Structure:

- Large serif headline (Lora, blue) with the copy above.
- Row of 4 stylized hexagonal/diamond image tiles centered below the headline.
- Two paragraphs of body copy beneath the tiles ("We supply capital to a variety of distributed energy projects…" / "We also partner with market leading ESCOs, EPCs, developers…").
- "NATIONAL PROJECTS" strip at the bottom: blue side label, then horizontal project tiles (state name caps + amount + small icon — Michigan / Indiana / Oregon / Illinois examples).
- Wire content through existing `homesections` / `homepage` schema where possible; only add Sanity fields if the current shape genuinely cannot represent the comp (confirm before extending).

### 2f. Project Submission page removal

- Delete the page file + nav entry. Add a redirect (`netlify.toml` or `gatsby-node` `createRedirect`) to `/` so old links don't 404.

### 2g. Style/layout pieces touching everything

- Verify Lora + Inter are loaded via `gatsby-browser`/`gatsby-ssr` only once. Mirror any layout-wrapper changes in **both** files (per `CLAUDE.md`).
- Update header link styles to match new comps (blue text on white, no underlines, Lora? confirm — comps show sans).
- Add a left-rail page label ("MAIN PAGE", "NEWS & EVENTS", "LEADERSHIP", etc.) — looks like a shared layout slot.

---

## 3. Suggested rollout order

1. Sanity: add `news.ts`, additive-only updates to `event.ts`, promote `casestudies` to top-level in `sidebar.tsx`, deploy schema. No data migration — editors will populate `news` from scratch and existing `event` docs stay untouched.
2. Sanity: enable `presentationTool` in `sanity.config.ts` with `resolve.locations` per §1d (point to local Gatsby in dev, production URL in prod via env).
3. Gatsby: ship `/news-and-events` mixed archive + `/news/:slug` template + nav update + redirect. Unblocks William's pending post.
4. Gatsby: visual update of `/events/:slug` template (RSVP form behavior unchanged).
5. Leadership refresh (visual only).
6. Home below-video section.
7. Remove Project Submission page + redirects.
