/**
 * The state outlines and the mask outside the US (FR-003, D-2). The map loads them from
 * `STATE_OUTLINES_URL`. `scripts/build-state-outlines.md` records how the file is built.
 */

/** A GeoJSON position, as [longitude, latitude]. */
type Position = readonly number[];
type Ring = readonly Position[];

export type OutlineGeometry =
  | { readonly type: 'Polygon'; readonly coordinates: readonly Ring[] }
  | {
      readonly type: 'MultiPolygon';
      readonly coordinates: readonly (readonly Ring[])[];
    };

export interface OutlineFeature {
  readonly type: 'Feature';
  /** A state carries its full name. The one mask feature carries `mask: true`. */
  readonly properties: { readonly name?: string; readonly mask?: boolean };
  readonly geometry: OutlineGeometry;
}

export interface StateOutlines {
  readonly type: 'FeatureCollection';
  readonly features: readonly OutlineFeature[];
}

export const STATE_OUTLINES_URL = '/maps/us-states.geojson';

/** Casts a ray east from the point and counts the edges it crosses. */
function crossesOddly(ring: Ring, { lat, lng }: google.maps.LatLngLiteral) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}

/** A polygon holds a point inside its outer ring and outside its holes. */
function polygonContains(
  rings: readonly Ring[],
  point: google.maps.LatLngLiteral,
) {
  return rings.filter((ring) => crossesOddly(ring, point)).length % 2 === 1;
}

export function contains(
  geometry: OutlineGeometry,
  point: google.maps.LatLngLiteral,
) {
  return geometry.type === 'Polygon'
    ? polygonContains(geometry.coordinates, point)
    : geometry.coordinates.some((rings) => polygonContains(rings, point));
}

/** The full name of the state that holds the point, or null outside every state. */
export function stateAt(
  outlines: StateOutlines,
  point: google.maps.LatLngLiteral,
): string | null {
  const feature = outlines.features.find(
    (f) => f.properties.name && contains(f.geometry, point),
  );
  return feature?.properties.name ?? null;
}

/**
 * The box around a state's outline, for State search (AC-9.4). Alaska's Aleutians pass the 180th
 * meridian, so an east longitude counts as its west equivalent. The box then has west greater
 * than east, which Google reads as crossing the meridian.
 */
export function boundsOf(
  outlines: StateOutlines,
  name: string,
): google.maps.LatLngBoundsLiteral | null {
  const feature = outlines.features.find((f) => f.properties.name === name);
  if (!feature) return null;
  const polygons =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const [x, y] of polygons.flat(2)) {
    const lng = x > 0 ? x - 360 : x;
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, y);
    north = Math.max(north, y);
  }
  return { west: west < -180 ? west + 360 : west, south, east, north };
}

/** Fetches the outlines file. It throws when the file is missing or unreadable. */
export async function loadStateOutlines(): Promise<StateOutlines> {
  const response = await fetch(STATE_OUTLINES_URL);
  if (!response.ok)
    throw new Error(
      `${STATE_OUTLINES_URL} answered with status ${response.status}.`,
    );
  return (await response.json()) as StateOutlines;
}
