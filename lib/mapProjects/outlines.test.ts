// @vitest-environment node
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STATE_ABBREVIATIONS } from '@/utils/extractState';
import { boundsOf, contains, type StateOutlines, stateAt } from './outlines';

const ASSET = fileURLToPath(
  new URL('../../public/maps/us-states.geojson', import.meta.url),
);
const readAsset = (): StateOutlines => JSON.parse(readFileSync(ASSET, 'utf8'));

const square = (x0: number, y0: number, x1: number, y1: number) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
  [x0, y0],
];

describe('contains', () => {
  const donut = {
    type: 'Polygon',
    coordinates: [square(0, 0, 10, 10), square(4, 4, 6, 6)],
  } as const;

  it('finds a point inside the ring', () => {
    expect(contains(donut, { lat: 2, lng: 2 })).toBe(true);
  });

  it('leaves out a point in a hole', () => {
    expect(contains(donut, { lat: 5, lng: 5 })).toBe(false);
  });

  it('leaves out a point outside the ring', () => {
    expect(contains(donut, { lat: 5, lng: 12 })).toBe(false);
  });

  it('checks every polygon of a multipolygon', () => {
    const islands = {
      type: 'MultiPolygon',
      coordinates: [[square(0, 0, 1, 1)], [square(5, 5, 6, 6)]],
    } as const;
    expect(contains(islands, { lat: 5.5, lng: 5.5 })).toBe(true);
    expect(contains(islands, { lat: 3, lng: 3 })).toBe(false);
  });
});

describe('stateAt', () => {
  const outlines = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { mask: true },
        geometry: { type: 'Polygon', coordinates: [square(-50, -50, 50, 50)] },
      },
      {
        type: 'Feature',
        properties: { name: 'Westland' },
        geometry: { type: 'Polygon', coordinates: [square(0, 0, 1, 1)] },
      },
      {
        type: 'Feature',
        properties: { name: 'Eastland' },
        geometry: { type: 'Polygon', coordinates: [square(1, 0, 2, 1)] },
      },
    ],
  } satisfies StateOutlines;

  it('names the state that holds the point', () => {
    expect(stateAt(outlines, { lat: 0.5, lng: 1.5 })).toBe('Eastland');
  });

  it('gives no state for a point under the mask only', () => {
    expect(stateAt(outlines, { lat: 20, lng: 20 })).toBeNull();
  });
});

describe('the state outlines asset (AC-2.2, NFR-003)', () => {
  it('stays under 100 KB', () => {
    expect(statSync(ASSET).size).toBeLessThan(100_000);
  });

  it('holds each state and DC once, by the full name the site stores', () => {
    const names = readAsset()
      .features.flatMap((f) => f.properties.name ?? [])
      .sort();
    expect(names).toEqual(Object.values(STATE_ABBREVIATIONS).sort());
  });

  it('holds one mask feature', () => {
    expect(readAsset().features.filter((f) => f.properties.mask)).toHaveLength(
      1,
    );
  });

  it.each([
    ['Newton', 42.337, -71.209, 'Massachusetts'],
    ['Little Rock', 34.746, -92.29, 'Arkansas'],
    ['Torrance', 33.836, -118.341, 'California'],
    // Staten Island sits close to the New Jersey line.
    ['Staten Island', 40.579, -74.151, 'New York'],
    ['Washington', 38.897, -77.036, 'District of Columbia'],
    ['Lansing', 42.733, -84.555, 'Michigan'],
    ['Honolulu', 21.307, -157.858, 'Hawaii'],
    ['Anchorage', 61.218, -149.9, 'Alaska'],
    // West of the antimeridian, so its longitude is positive.
    ['Attu Island', 52.85, 173.0, 'Alaska'],
  ])('places %s in its state', (_, lat, lng, state) => {
    expect(stateAt(readAsset(), { lat, lng })).toBe(state);
  });

  const mask = () => {
    const feature = readAsset().features.find((f) => f.properties.mask);
    if (!feature) throw new Error('The asset has no mask feature.');
    return feature.geometry;
  };

  it.each([
    ['Toronto', 43.653, -79.383],
    ['Mexico City', 19.433, -99.133],
    ['San Juan', 18.466, -66.106],
    ['Lake Michigan', 43.5, -87.2],
    ['the far northwest', 84.5, -179.5],
    ['the far southeast', -84.5, 179.5],
  ])('masks %s, outside every state (D-2)', (_, lat, lng) => {
    expect(stateAt(readAsset(), { lat, lng })).toBeNull();
    expect(contains(mask(), { lat, lng })).toBe(true);
  });

  it.each([
    ['Newton', 42.337, -71.209],
    ['Honolulu', 21.307, -157.858],
    ['Attu Island', 52.85, 173.0],
  ])('leaves %s unmasked', (_, lat, lng) => {
    expect(contains(mask(), { lat, lng })).toBe(false);
  });
});

describe('boundsOf (AC-9.4)', () => {
  const outlines: StateOutlines = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Squareland' },
        geometry: { type: 'Polygon', coordinates: [square(-105, 35, -95, 45)] },
      },
      {
        type: 'Feature',
        properties: { name: 'Islandland' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [square(-170, 50, -130, 70)],
            [square(172, 51, 179, 53)],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { mask: true },
        geometry: {
          type: 'Polygon',
          coordinates: [square(-180, -90, 180, 90)],
        },
      },
    ],
  };

  it("gives a state's box", () => {
    expect(boundsOf(outlines, 'Squareland')).toEqual({
      west: -105,
      south: 35,
      east: -95,
      north: 45,
    });
  });

  it('wraps a state across the 180th meridian, so west is greater than east', () => {
    expect(boundsOf(outlines, 'Islandland')).toEqual({
      west: 172,
      south: 50,
      east: -130,
      north: 70,
    });
  });

  it('gives nothing for a name it lacks', () => {
    expect(boundsOf(outlines, 'Nowhere')).toBeNull();
  });

  it("frames Alaska's islands with its mainland in the real asset", () => {
    const alaska = boundsOf(readAsset(), 'Alaska');
    expect(alaska?.west).toBeGreaterThan(170);
    expect(alaska?.east).toBeLessThan(-129);
    expect(alaska?.east).toBeGreaterThan(-132);
    expect(boundsOf(readAsset(), 'California')).toEqual({
      west: -124.41,
      south: 32.534,
      east: -114.139,
      north: 41.998,
    });
  });
});
