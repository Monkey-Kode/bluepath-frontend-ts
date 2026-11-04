# Map overlap (AC-2.9)

Checks that the map, key, legend, and panel never overlap each other or Google's branding at six widths.

- **Prerequisites:** the map loads without Google's error box. Locally, that needs the key to allow `http://localhost:3000/*`.
- **Entry point:** `scripts/overlap.sh --url /projects/`.
- **Actions:** pass one `name=SELECTOR` per region that the map component renders, plus the legend buttons as `--min-target`.

  ```sh
  scripts/overlap.sh --url /projects/ \
    --out ../.claude/specs/feat/case-studies/.mk-goal/evidence/map-overlap \
    map=SELECTOR key=SELECTOR legend=SELECTOR panel=SELECTOR \
    --min-target 'LEGEND_BUTTON_SELECTOR' --min-size 24
  ```

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
- **Limits:** the helper measures the first screen after a full scroll. It does not test one-finger scrolling or two-finger zoom over the map. Check those by hand on a touch device or in device emulation.
