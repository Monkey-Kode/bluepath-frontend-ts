# Build the state outlines

`public/maps/us-states.geojson` holds the outline of each state and DC except Alaska, plus one
mask feature that covers the rest of the world. The projects map shades the states and paints the mask white
(FR-003, D-2). `lib/mapProjects/outlines.test.ts` checks the file.

Rebuild it only when the Census Bureau publishes a new year or the map needs different detail.

## Source

The source is the Census Bureau's 2024 cartographic boundary file for states at 1:20,000,000.

- URL: `https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip`
- Size: 187,671 bytes
- SHA-256: `7bc773d83c01b6df69b8aada9c2b5983d97f22f4551947cc5c00b87c663223ef`

Download it into a new, empty folder outside the repository. Then check the hash and unzip it.

```sh
mkdir -p ~/tmp/census && cd ~/tmp/census
curl -fsSLO https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip
shasum -a 256 cb_2024_us_state_20m.zip
unzip -d shp cb_2024_us_state_20m.zip
```

## Build

Run this from a different folder, such as the repository root. Replace `SHP` with the path to
the unzipped `cb_2024_us_state_20m.shp`. `pnpm dlx` runs mapshaper without adding it to the
lockfile.

```sh
pnpm dlx mapshaper@0.7.101 -i SHP name=states \
  -filter 'STUSPS != "PR" && STUSPS != "AK"' -proj wgs84 -simplify dp interval=4000 keep-shapes \
  -rename-fields name=NAME -filter-fields name \
  -dissolve + name=us \
  -rectangle bbox=-180,-85,180,85 name=mask \
  -densify interval=10 planar target=mask \
  -erase target=mask source=us \
  -each target=mask 'mask = true' \
  -merge-layers target=states,mask force name=outlines \
  -o public/maps/us-states.geojson format=geojson rfc7946 precision=0.001 force
```

Then run `pnpm exec vitest run lib/mapProjects/outlines.test.ts`.

On Nov 19, 2026, the command gave a file of 59,501 bytes, or 16,308 bytes with gzip. Without
Alaska in the filter, it still gives the earlier 90,965-byte file byte for byte. Mapshaper prints a warning
that the `mask` and `name` fields are missing from one layer. That warning is expected. Each state
has only a name, and the mask has only `mask: true`.

## Choices

- **Puerto Rico is left out.** The map shows the states and DC named in `STATE_ABBREVIATIONS` in
  `utils/extractState.ts`.
- **Alaska is left out for now.** The client asked on Nov 19, 2026, because BluePath has no work
  there (D-54). The mask covers Alaska, as it covers Canada. `MAP_STATES` in
  `lib/mapProjects/outlines.ts` lists the states on the map, and the outline test checks the file
  against it. To bring Alaska back, drop `AK` from both the filter and `MAP_STATES`.
- **Douglas-Peucker at 4,000 m.** This keeps the file under the 100 KB budget in NFR-003. Of the
  503 website and BlueIQ pins checked on Nov 4, 2026, none changed state against the
  unsimplified outlines.
- **Not Visvalingam.** At 10% to 20%, Visvalingam moved real pins on Staten Island into New Jersey.
- **Small islands stay.** `keep-shapes` stops simplification from deleting small islands.
- **The mask is one polygon with a hole for each part of the US.** Its outer ring spans longitude
  -180 to 180 and latitude -85 to 85. Google Maps cannot show latitudes past about 85 degrees.
- **The mask edge has a vertex every 10 degrees.** A map can draw one long edge from -180 to 180
  the wrong way around the world. The extra vertices keep each edge short.
- **RFC 7946 output.** Outer rings run counterclockwise and holes run clockwise. Coordinates keep
  3 decimal places, about 100 m.
- **Alaska crosses the antimeridian.** Its western Aleutian islands have positive longitudes.
  While Alaska was on the map, the outline test checked Attu Island for this. It now checks that
  the mask covers Attu Island.
