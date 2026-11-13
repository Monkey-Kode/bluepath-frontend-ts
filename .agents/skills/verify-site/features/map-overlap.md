# Map overlap (AC-2.9)

Checks that the search, key, legend, and panel never overlap each other or Google's branding and zoom buttons at six widths.

- **Prerequisites:** the map loads without Google's error box. Locally, that needs the key to allow `http://localhost:3000/*`.
- **Entry point:** `scripts/overlap.sh --url /projects/`.
- **Actions:** the map fills the screen, and every other region sits on top of it. So leave the map out of the regions.
  The resting panel is empty or screen-reader-only on small screens, so the rest run leaves it out too.

  ```sh
  EVIDENCE=../.agents/specs/feat/case-studies/.mk-goal/evidence/map-overlap
  scripts/overlap.sh --url /projects/ --out "$EVIDENCE/rest" \
    search='[data-map-search]' key='[data-map-key]' legend='[data-map-legend]' \
    zoom='.gm-style button[aria-label="Zoom in"], .gm-style button[aria-label="Zoom out"]' \
    --min-target '[data-map-legend] button' --min-size 24
  ```

  To check the panel, pick a project first. `overlap.sh` has no pick step, so drive `agent-browser` by hand at each viewport.
  Fill `[data-map-search] [role=combobox]` with a project name, click the first `[role=option]`, and wait 2.5 s for the flight.
  Then pipe `const CONFIG = {...};` and `scripts/overlap.js` to `agent-browser eval --stdin`, with `panel='[data-map-panel]'` added to the items.

  When the map shows Google's error box, add `--wait '[data-map-legend]'`. The run then still measures the other regions, and fails only on Google's missing logo and attribution.
  Don't wait on the panel. Below 800 px, the resting panel has no visible box, so the wait times out.
  Each run loads the map once per viewport. A demo Maps key has a small daily quota, and a day of repeated runs can use it up. The console then says "Maps Demo Key limit reached".

- **Expected result:** `PASS` at all six viewports and exit code 0.
- **Evidence:** `overlap-<viewport>.json` lists each region's boxes and any failure. `overlap-<viewport>.png` shows the screen.
- **Known-bad proof:** two regions that cover each other fail with `a overlaps b by N px²`. A selector with no visible match fails with `nothing visible matches`.
  If the map never loads, the run fails with `'.gm-style-cc' never appeared`.
- **Proof on 2026-11-04 at `4448905`** used the live map, because the key blocks `localhost`:
  - `map=.gm-style` with Google's buttons as `--min-target` passed at all six viewports.
  - `header=header` against Google's buttons failed at 375×667. Today's site header covers the map's top controls.
  - `legend='[data-map-legend]'` failed with `nothing visible matches`.
  - The same run against the local server failed because the map never loaded.
  - Evidence is in `../.agents/specs/feat/case-studies/.mk-goal/evidence/map-overlap-tool-proof/`.
- **Run on 2026-11-04 for T036**, local server on port 3100 with Google's error box:
  - The header, map, key, legend, and panel never overlapped at the six viewports. Nothing scrolled sideways, and every legend button measured at least 24×24 px.
  - Each viewport failed only on `google-logo` and `google-attribution`, because Google drew no map.
  - Evidence is in `../.agents/specs/feat/case-studies/.mk-goal/evidence/story-2/t036/`.
- **Run on 2026-11-12 for T155**, local server on port 3000 with a working map and the full-screen layout:
  - The rest run passed at all six viewports.
  - A Menifee pick passed at all six viewports with the panel included. The panel showed the project each time.
  - Evidence is in `../.agents/specs/feat/case-studies/.mk-goal/evidence/map-overlap/phase14-rest/` and `phase14-pick/`. The pick script is `phase14-pick/pick-overlap.sh`.
- **Run on 2026-11-12 for T158**, local server on port 3000, after the Maps key's daily quota ran out:
  - The rest run and a Menifee pick run passed at all six viewports, apart from Google's missing logo and attribution.
  - Framing and Google's zoom buttons still need a run with a working map.
  - Evidence is in `../.agents/specs/feat/case-studies/.mk-goal/evidence/map-overlap/panel-final-rest-nomap/` and `panel-final-pick-nomap/`.
- **Limits:** the helper measures the first screen after a full scroll. It does not test one-finger scrolling or two-finger zoom over the map. Check those by hand on a touch device or in device emulation.
