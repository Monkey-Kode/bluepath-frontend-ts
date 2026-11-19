/**
 * Camera math for the projects map in Google's Web Mercator projection. The search, panel, key,
 * and legend sit on top of the map, so the map frames its targets in the open area between them
 * (AC-2.10, AC-9.3). Google's own `fitBounds` snaps to whole zoom levels on this raster map.
 */

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Camera {
  center: google.maps.LatLngLiteral;
  zoom: number;
}

export const NO_PADDING: Padding = { top: 0, right: 0, bottom: 0, left: 0 };

/** A box on the screen, as `getBoundingClientRect` gives it. */
export interface Box {
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * How far the UI parts reach over the map's top and bottom. A part that ends above the map's
 * middle covers the top. Every other part covers the bottom, even a tall panel whose middle rises
 * past the map's middle. A part with no size covers nothing. The sides keep a fixed gap.
 */
export function paddingAround(
  frame: Box,
  parts: readonly Box[],
  side: number,
): Padding {
  const middle = frame.top + frame.height / 2;
  let top = 0;
  let bottom = 0;
  for (const part of parts) {
    if (part.width === 0 || part.height === 0) continue;
    if (part.bottom < middle) top = Math.max(top, part.bottom - frame.top);
    else bottom = Math.max(bottom, frame.bottom - part.top);
  }
  return { top, right: side, bottom, left: side };
}

/** One world tile at zoom 0, in pixels. */
const TILE = 256;

const worldX = (lng: number) => ((lng + 180) / 360) * TILE;

function worldY(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * TILE;
}

/** The longitude of a world x, wrapped into -180 to 180. */
const lngOf = (x: number) =>
  (((((x / TILE) * 360 - 180) % 360) + 540) % 360) - 180;

const latOf = (y: number) =>
  ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * y) / TILE))) - Math.PI / 2) *
    180) /
  Math.PI;

/**
 * The map center that puts a world point in the middle of the open area. The open area's middle
 * sits off the map's middle by half the difference between opposite paddings.
 */
function centerAt(x: number, y: number, zoom: number, padding: Padding) {
  const scale = 2 ** zoom;
  return {
    lat: latOf(y - (padding.top - padding.bottom) / 2 / scale),
    lng: lngOf(x - (padding.left - padding.right) / 2 / scale),
  };
}

/**
 * The camera that fits the bounds inside the open area, at a fractional zoom no higher than
 * `maxZoom`. A west edge greater than the east edge crosses the antimeridian, as Alaska does.
 */
export function cameraForBounds(
  { south, west, north, east }: google.maps.LatLngBoundsLiteral,
  size: Size,
  padding: Padding,
  maxZoom = 22,
): Camera {
  const left = worldX(west);
  const right = worldX(east < west ? east + 360 : east);
  const top = worldY(north);
  const bottom = worldY(south);
  // A map without a size yet still gets a finite camera. The next frame corrects it.
  const width = Math.max(1, size.width - padding.left - padding.right);
  const height = Math.max(1, size.height - padding.top - padding.bottom);
  const fit = Math.log2(
    Math.min(
      width / Math.max(right - left, 1e-9),
      height / Math.max(bottom - top, 1e-9),
    ),
  );
  const zoom = Math.min(maxZoom, fit);
  return {
    center: centerAt((left + right) / 2, (top + bottom) / 2, zoom, padding),
    zoom,
  };
}

/**
 * The zoom at which the open area's typical side spans this many degrees of longitude. The
 * typical side is the geometric mean of the width and the height, so a wide desktop and a tall
 * phone show about the same stretch of country. It stays between zoom 3 and 12.
 */
export function zoomForSpan(degrees: number, size: Size, padding: Padding) {
  const width = Math.max(1, size.width - padding.left - padding.right);
  const height = Math.max(1, size.height - padding.top - padding.bottom);
  const zoom = Math.log2((Math.sqrt(width * height) * 360) / (TILE * degrees));
  return Math.min(12, Math.max(3, zoom));
}

/** The map center that puts the point in the middle of the open area at this zoom. */
export function centerFor(
  { lat, lng }: google.maps.LatLngLiteral,
  zoom: number,
  padding: Padding,
): google.maps.LatLngLiteral {
  return centerAt(worldX(lng), worldY(lat), zoom, padding);
}

/** Slow at both ends. */
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The camera at `t`, from 0 to 1, of a flight between two cameras (AC-9.3). The end's center moves
 * on a straight line to the middle of the screen. A flight longer than the screen zooms out on the
 * way, so the map never streaks past.
 */
export function cameraAlong(
  from: Camera,
  to: Camera,
  t: number,
  size: Size,
): Camera {
  const e = ease(Math.min(1, Math.max(0, t)));
  const start = { x: worldX(from.center.lng), y: worldY(from.center.lat) };
  const end = { x: worldX(to.center.lng), y: worldY(to.center.lat) };
  // Crossing the antimeridian is shorter than going the long way around.
  const wrap = Math.abs(end.x - start.x) > TILE / 2;
  if (wrap) end.x += end.x < start.x ? TILE : -TILE;
  // The end's offset from the screen's middle at the start, in pixels.
  const offset = {
    x: (end.x - start.x) * 2 ** from.zoom,
    y: (end.y - start.y) * 2 ** from.zoom,
  };
  const screens =
    Math.hypot(offset.x, offset.y) / Math.max(size.width, size.height, 1);
  const dip = Math.max(0, Math.log2(screens)) * Math.sin(Math.PI * e);
  const base = from.zoom + (to.zoom - from.zoom) * e;
  // The center moves by the zoom before the dip. At the dipped zoom, each pixel covers more of the
  // map, so the center would first swing back past the start.
  const scale = 2 ** base;
  const zoom = base - dip;
  return {
    center: {
      lat: latOf(end.y - (offset.y * (1 - e)) / scale),
      lng: lngOf(end.x - (offset.x * (1 - e)) / scale),
    },
    zoom,
  };
}
