# Map overlap (AC-2.9)

Checks that the map, key, legend, and panel never overlap each other or Google's branding at six widths.

- **Prerequisites:** the map loads without Google's error box. Locally, that needs the key to allow `http://localhost:3000/*`.
- **Entry point:** `scripts/overlap.sh --url /projects/`.
- **Actions:** run the helper twice with the regions that `components/Projects.tsx` renders.
  Below 800 px, the key sits under the map, so the narrow run allows no overlap.
  From 800 px, the key sits inside the map, so the wide run allows `key:map`.

  ```sh
  EVIDENCE=../.claude/specs/feat/case-studies/.mk-goal/evidence/map-overlap
  REGIONS=(header=header map='[data-map-root]' key='[data-map-key]' legend='[data-map-legend]'
    panel='[data-map-panel]' --min-target '[data-map-legend] button' --min-size 24)
  scripts/overlap.sh --url /projects/ --out "$EVIDENCE/narrow" \
    --viewports "320x568 375x667 768x1024" "${REGIONS[@]}"
  scripts/overlap.sh --url /projects/ --out "$EVIDENCE/wide" \
    --viewports "1024x768 1280x720 1440x900" --allow key:map "${REGIONS[@]}"
  ```

  When the map shows Google's error box, add `--wait '[data-map-panel]'`. The run then still measures the other regions.

- **Expected result:** `PASS` at all six viewports and exit code 0.
- **Evidence:** `overlap-<viewport>.json` lists each region's boxes and any failure. `overlap-<viewport>.png` shows the screen.
- **Known-bad proof:** two regions that cover each other fail with `a overlaps b by N px²`. A selector with no visible match fails with `nothing visible matches`.
  If the map never loads, the run fails with `'.gm-style-cc' never appeared`.
- **Proof on 2026-11-04 at `4448905`** used the live map, because the key blocks `localhost`:
  - `map=.gm-style` with Google's buttons as `--min-target` passed at all six viewports.
  - `header=header` against Google's buttons failed at 375×667. Today's site header covers the map's top controls.
  - `legend='[data-map-legend]'` failed with `nothing visible matches`.
  - The same run against the local server failed because the map never loaded.
  - Evidence is in `../.claude/specs/feat/case-studies/.mk-goal/evidence/map-overlap-tool-proof/`.
- **Run on 2026-11-04 for T036**, local server on port 3100 with Google's error box:
  - The header, map, key, legend, and panel never overlapped at the six viewports. Nothing scrolled sideways, and every legend button measured at least 24×24 px.
  - Each viewport failed only on `google-logo` and `google-attribution`, because Google drew no map.
  - Evidence is in `../.claude/specs/feat/case-studies/.mk-goal/evidence/story-2/t036/`.
- **Limits:** the helper measures the first screen after a full scroll. It does not test one-finger scrolling or two-finger zoom over the map. Check those by hand on a touch device or in device emulation.
