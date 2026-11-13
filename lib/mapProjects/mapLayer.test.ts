import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATEGORY_BY_KEY } from '@/lib/categories';
import { MAP_ID } from '@/lib/mapsLoader';
import { fakeMaps } from '@/test/fakeMaps';
import { screenPoint } from '@/test/mercator';
import type { Padding } from './camera';
import {
  createMapLayer,
  type LayerProject,
  STATE_SPAN,
  ZIP_SPAN,
} from './mapLayer';
import type { StateOutlines } from './outlines';
import { idle } from './selection';
import { shadeFor } from './shading';

const plotted: LayerProject[] = [
  {
    id: 'sun',
    plantName: 'Sun Farm',
    projectType: 'Solar',
    location: { lat: 40, lng: -100 },
  },
  {
    id: 'cell',
    plantName: 'Cell Bank',
    projectType: 'BESS',
    location: { lat: 35, lng: -90 },
  },
  {
    id: 'bulb',
    title: 'Bulb Works',
    technologies: ['LED Lighting'],
    location: { lat: 42, lng: -80 },
  },
  {
    id: 'isle',
    projectName: 'Isle Array',
    projectType: 'Solar',
    location: { lat: 21.3, lng: -157.8 },
  },
];

const notPlotted: LayerProject[] = [
  {
    id: 'hidden',
    plantName: 'Hidden Plant',
    projectType: 'Solar',
    hiddenAt: '2026-11-04T12:00:00Z',
    location: { lat: 40, lng: -100 },
  },
  {
    id: 'inactive',
    plantName: 'Inactive Plant',
    projectType: 'Solar',
    active: false,
    location: { lat: 40, lng: -100 },
  },
  {
    id: 'wind',
    plantName: 'Wind Plant',
    projectType: 'Wind',
    location: { lat: 40, lng: -100 },
  },
  {
    id: 'nowhere',
    plantName: 'Nowhere Plant',
    projectType: 'Solar',
    location: null,
  },
];

const square = (west: number, south: number, east: number, north: number) => [
  [west, south],
  [east, south],
  [east, north],
  [west, north],
  [west, south],
];

const outlines = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Westland' },
      geometry: { type: 'Polygon', coordinates: [square(-105, 35, -95, 45)] },
    },
    {
      type: 'Feature',
      properties: { name: 'Emptyland' },
      geometry: { type: 'Polygon', coordinates: [square(-75, 45, -70, 50)] },
    },
    {
      type: 'Feature',
      properties: { mask: true },
      geometry: {
        type: 'Polygon',
        coordinates: [square(-180, -85, 180, 85), square(-130, 20, -60, 50)],
      },
    },
  ],
} satisfies StateOutlines;

/** Handles bounds that cross the antimeridian, where west is greater than east. */
const holds = (
  bounds: google.maps.LatLngBoundsLiteral,
  { lat, lng }: google.maps.LatLngLiteral,
) =>
  lat >= bounds.south &&
  lat <= bounds.north &&
  (bounds.west <= bounds.east
    ? lng >= bounds.west && lng <= bounds.east
    : lng >= bounds.west || lng <= bounds.east);

const places = {
  maine: { lat: 44.8, lng: -66.95 },
  keyWest: { lat: 24.55, lng: -81.8 },
  seattle: { lat: 47.6, lng: -122.3 },
  sanDiego: { lat: 32.7, lng: -117.2 },
  northDakota: { lat: 49, lng: -100 },
  honolulu: { lat: 21.3, lng: -157.8 },
  hilo: { lat: 19.7, lng: -155.1 },
  anchorage: { lat: 61.2, lng: -149.9 },
  utqiagvik: { lat: 71.3, lng: -156.8 },
  attu: { lat: 52.9, lng: 172.9 },
};

let fake: ReturnType<typeof fakeMaps>;
let element: HTMLElement;
const onPickMarker = vi.fn();
const onClickMap = vi.fn();

/** The search covers the top, and the key and the legend cover the bottom, with no panel shown. */
const OPEN: Padding = { top: 120, right: 16, bottom: 110, left: 16 };
let padding = OPEN;
let size = { width: 1440, height: 780 };
let reduceMotion = false;
/** Animation frames that the layer asked for and that haven't run yet. */
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
/** Reports a new size, as Google's map element does through a ResizeObserver. */
let resize: (() => void) | null = null;

const create = (
  projects: readonly LayerProject[] = [...plotted, ...notPlotted],
  withOutlines: StateOutlines | null = outlines,
) =>
  createMapLayer(element, fake.libraries, {
    projects,
    outlines: withOutlines,
    onPickMarker,
    onClickMap,
    padding: () => padding,
  });

function resizeTo(width: number, height: number) {
  size = { width, height };
  resize?.();
}

/** Runs the waiting frames at each time, in milliseconds. */
function runFrames(...times: number[]) {
  for (const time of times) {
    const waiting = [...frames.values()];
    frames.clear();
    for (const frame of waiting) frame(time);
  }
}

const camera = () => {
  const { center, zoom } = fake.map();
  if (!center || zoom === null) throw new Error('The map has no camera.');
  return { center, zoom };
};

/** True when the point shows inside the part of the map that the UI leaves open. */
const inOpenArea = (point: google.maps.LatLngLiteral) => {
  const { x, y } = screenPoint(point, camera(), size);
  return (
    x >= OPEN.left - 1e-6 &&
    x <= size.width - OPEN.right + 1e-6 &&
    y >= OPEN.top - 1e-6 &&
    y <= size.height - OPEN.bottom + 1e-6
  );
};

/** The degrees of longitude that the open area's typical side spans at the camera's zoom. */
const span = () =>
  (Math.sqrt(
    (size.width - OPEN.left - OPEN.right) *
      (size.height - OPEN.top - OPEN.bottom),
  ) *
    360) /
  (256 * 2 ** camera().zoom);

/** The middle of the open area, where a search pick lands. */
const openMiddle = () => ({
  x: (OPEN.left + size.width - OPEN.right) / 2,
  y: (OPEN.top + size.height - OPEN.bottom) / 2,
});

beforeEach(() => {
  fake = fakeMaps();
  element = document.createElement('div');
  Object.defineProperties(element, {
    clientWidth: { get: () => size.width },
    clientHeight: { get: () => size.height },
  });
  padding = OPEN;
  size = { width: 1440, height: 780 };
  reduceMotion = false;
  frames = new Map();
  nextFrame = 1;
  resize = null;
  onPickMarker.mockReset();
  onClickMap.mockReset();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && reduceMotion,
  }));
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => {
    frames.set(nextFrame, frame);
    return nextFrame++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(report: () => void) {
        resize = report;
      }
      observe() {}
      disconnect() {
        resize = null;
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('markers (AC-2.1, AC-2.8)', () => {
  it('plots one marker for each plotted project and none for the rest', () => {
    create();
    expect(fake.markers.map((marker) => marker.title)).toEqual([
      'Sun Farm, Solar',
      'Cell Bank, Battery',
      'Bulb Works, Energy Efficiency',
      'Isle Array, Solar',
    ]);
    for (const marker of fake.markers) {
      expect(marker.map).toBe(fake.map());
    }
  });

  it('places each marker at its project, Hawaii included', () => {
    create();
    expect(fake.marker('Isle Array').position).toEqual(places.honolulu);
  });

  it('colors each marker from the category definition', () => {
    create();
    expect(fake.marker('Sun Farm').dot).toHaveStyle({
      backgroundColor: CATEGORY_BY_KEY.solar.color,
    });
    expect(fake.marker('Cell Bank').dot).toHaveStyle({
      backgroundColor: CATEGORY_BY_KEY.bess.color,
    });
    expect(fake.marker('Bulb Works').dot).toHaveStyle({
      backgroundColor: CATEGORY_BY_KEY.energyEfficiency.color,
    });
  });

  it('makes every marker clickable, so Tab, the arrow keys, Enter, and Space reach it', () => {
    create();
    for (const marker of fake.markers) {
      expect(marker.gmpClickable).toBe(true);
    }
  });

  it('centers each round marker on its position', () => {
    create();
    for (const marker of fake.markers) {
      expect(marker.anchorTop).toBe('-50%');
      expect(marker.dot).toHaveClass('rounded-full');
    }
  });
});

describe('picks and clicks (AC-2.6)', () => {
  it('reports a marker pick with the project and its category', () => {
    create();
    fake.marker('Cell Bank').pick();
    expect(onPickMarker).toHaveBeenCalledExactlyOnceWith({
      id: 'cell',
      category: 'bess',
    });
    expect(onClickMap).not.toHaveBeenCalled();
  });

  it('reports a click on empty map, but not a marker click that reaches the map', () => {
    create();
    fake.map().trigger('click', { domEvent: { target: element } });
    expect(onClickMap).toHaveBeenCalledTimes(1);

    fake.map().trigger('click', {
      domEvent: { target: fake.marker('Sun Farm').dot },
    });
    expect(onClickMap).toHaveBeenCalledTimes(1);
  });
});

describe('marker looks (AC-2.4, AC-2.5, NFR-002)', () => {
  it('raises the picked marker above the rest and dims other categories', () => {
    const layer = create();
    layer.show({ filter: null, project: { id: 'sun', category: 'solar' } });
    const sun = fake.marker('Sun Farm');
    expect(sun.look).toBe('selected');
    expect(fake.marker('Isle Array').look).toBe('normal');
    expect(fake.marker('Cell Bank').look).toBe('dimmed');
    expect(fake.marker('Bulb Works').look).toBe('dimmed');
    for (const marker of fake.markers) {
      expect(marker.map).toBe(fake.map());
      if (marker !== sun)
        expect(sun.zIndex).toBeGreaterThan(marker.zIndex ?? 0);
    }
  });

  it('takes other categories off the map under a filter, and puts them back after', () => {
    const layer = create();
    layer.show({ filter: 'solar', project: null });
    expect(fake.marker('Cell Bank').map).toBeNull();
    expect(fake.marker('Bulb Works').map).toBeNull();
    expect(fake.marker('Sun Farm').map).toBe(fake.map());
    expect(fake.marker('Isle Array').look).toBe('normal');

    layer.show(idle);
    for (const marker of fake.markers) {
      expect(marker.map).toBe(fake.map());
      expect(marker.look).toBe('normal');
      expect(marker.zIndex).toBeNull();
    }
  });

  it('animates the scale and fade only when the visitor allows motion', () => {
    create();
    const classes = [...fake.marker('Sun Farm').dot.classList];
    expect(classes.some((name) => name.includes('transition'))).toBe(true);
    for (const name of classes.filter((c) => c.includes('transition'))) {
      expect(name).toMatch(/^motion-safe:/);
    }
  });
});

describe('the map (AC-2.9, AC-2.10)', () => {
  it('keeps the Map ID, which holds the base style', () => {
    create();
    expect(fake.map().options.mapId).toBe(MAP_ID);
  });

  it('lets one finger scroll the page', () => {
    create();
    expect(fake.map().options.gestureHandling).toBe('cooperative');
  });

  // Whole zoom levels would leave the lower 48 too small or cut off on most screens.
  it('allows fractional zoom', () => {
    create();
    expect(fake.map().options.isFractionalZoomEnabled).toBe(true);
  });

  it('frames the lower 48 states first, in the part of the map that the UI leaves open', () => {
    create();
    for (const place of [
      places.maine,
      places.keyWest,
      places.seattle,
      places.sanDiego,
      places.northDakota,
    ]) {
      expect(inOpenArea(place)).toBe(true);
    }
    expect(inOpenArea(places.honolulu)).toBe(false);
    expect(inOpenArea(places.anchorage)).toBe(false);
  });

  it('frames the lower 48 again after a resize, until the visitor drags the map', () => {
    create();
    resizeTo(390, 600);
    expect(inOpenArea(places.maine)).toBe(true);
    expect(inOpenArea(places.seattle)).toBe(true);

    fake.map().trigger('dragstart');
    const dragged = camera();
    resizeTo(1440, 780);
    expect(camera()).toEqual(dragged);
  });

  // The zoom buttons, the keyboard, and Ctrl with the wheel move the map without a drag event.
  it('keeps the view after the visitor zooms without a drag', () => {
    create();
    fake.map().setZoom(7);
    const zoomed = camera();
    resizeTo(390, 600);
    expect(camera()).toEqual(zoomed);
  });

  it('keeps the view after the visitor pans without a drag', () => {
    create();
    fake.map().setCenter({ lat: 40, lng: -80 });
    const panned = camera();
    resizeTo(1024, 700);
    expect(camera()).toEqual(panned);
  });

  it('waits until the map has a size', () => {
    size = { width: 0, height: 0 };
    create();
    expect(fake.map().cameraMoves).toBe(0);
    resizeTo(1440, 780);
    expect(inOpenArea(places.keyWest)).toBe(true);
  });

  it('keeps panning and zooming within a region that holds every state', () => {
    create();
    const { restriction } = fake.map().options;
    expect(restriction?.strictBounds).toBe(true);
    const region = restriction?.latLngBounds as google.maps.LatLngBoundsLiteral;
    for (const place of Object.values(places)) {
      expect(holds(region, place)).toBe(true);
    }
    // Beijing stays outside, so the region doesn't wrap the whole world.
    expect(holds(region, { lat: 39.9, lng: 116.4 })).toBe(false);
  });

  it.each([
    { width: 1280, height: 600 },
    // A 1440 px window with the map at its 30rem minimum height.
    { width: 1440, height: 480 },
    { width: 1920, height: 480 },
  ])('leaves the first view room inside the region on a short, wide $width×$height map', (short) => {
    // The search at the top and the resting prompt, key, and legend at the bottom leave a low,
    // wide open area. A region that is too narrow makes Google clamp the first view, and the UI
    // covers part of the lower 48.
    size = short;
    padding = { top: 102, right: 16, bottom: 156, left: 16 };
    create();
    const region = fake.map().options.restriction
      ?.latLngBounds as google.maps.LatLngBoundsLiteral;
    const { lat } = camera().center;
    // The region's edges lie at or past the screen's sides. It crosses the antimeridian, so its
    // west edge counts from 360 degrees back.
    const west = screenPoint({ lat, lng: region.west - 360 }, camera(), size);
    const east = screenPoint({ lat, lng: region.east }, camera(), size);
    expect(west.x).toBeLessThanOrEqual(0);
    expect(east.x).toBeGreaterThanOrEqual(size.width);
  });
});

describe('outlines and mask (AC-2.1, AC-2.2)', () => {
  it('draws the outlines file in the data layer', () => {
    create();
    expect(fake.map().data.added).toEqual([outlines]);
  });

  it('masks land outside the US in solid white', () => {
    create();
    expect(fake.map().data.styleOf({ mask: true })).toMatchObject({
      fillColor: '#ffffff',
      fillOpacity: 1,
      strokeWeight: 0,
    });
  });

  it('shades a state by the plotted projects inside it', () => {
    create();
    // Sun Farm is the one plotted project in Westland. The hidden, inactive, and
    // uncategorized projects there don't count.
    expect(fake.map().data.styleOf({ name: 'Westland' })).toMatchObject({
      fillColor: shadeFor(1),
      fillOpacity: 1,
    });
  });

  it('leaves a state with no projects unfilled, so the base land shows', () => {
    create();
    expect(fake.map().data.styleOf({ name: 'Emptyland' })).toMatchObject({
      fillOpacity: 0,
    });
  });

  it('lets clicks on states and the mask reach the map', () => {
    create();
    for (const properties of [
      { mask: true },
      { name: 'Westland' },
      { name: 'Emptyland' },
    ]) {
      expect(fake.map().data.styleOf(properties).clickable).toBe(false);
    }
  });

  it('still plots markers when the outlines failed to load', () => {
    create(plotted, null);
    expect(fake.map().data.added).toEqual([]);
    expect(fake.markers).toHaveLength(plotted.length);
  });
});

describe('destroy', () => {
  it('stops a flight and stops framing on resize', () => {
    const layer = create();
    layer.focus({ kind: 'project', id: 'cell' });
    layer.destroy();
    expect(frames.size).toBe(0);
    expect(resize).toBeNull();
  });

  it('takes the markers off the map and stops reporting clicks', () => {
    const layer = create();
    layer.destroy();
    for (const marker of fake.markers) {
      expect(marker.map).toBeNull();
    }
    fake.map().trigger('click', { domEvent: { target: element } });
    expect(onClickMap).not.toHaveBeenCalled();
  });
});

describe('the camera for a search pick (AC-9.3 to AC-9.5, NFR-002)', () => {
  const cellBank = { lat: 35, lng: -90 };

  it("flies to a project's marker at state level, so nearby markers show", () => {
    const layer = create();
    const before = fake.map().cameraMoves;
    layer.focus({ kind: 'project', id: 'cell' });
    runFrames(1000, 1300, 1600, 2500);

    expect(fake.map().cameraMoves - before).toBeGreaterThan(2);
    expect(span()).toBeCloseTo(STATE_SPAN, 6);
    const landed = screenPoint(cellBank, camera(), size);
    expect(landed.x).toBeCloseTo(openMiddle().x, 6);
    expect(landed.y).toBeCloseTo(openMiddle().y, 6);
  });

  it('jumps in one move when the visitor prefers reduced motion', () => {
    reduceMotion = true;
    const layer = create();
    const before = fake.map().cameraMoves;
    layer.focus({ kind: 'project', id: 'cell' });

    expect(fake.map().cameraMoves - before).toBe(1);
    expect(frames.size).toBe(0);
    expect(span()).toBeCloseTo(STATE_SPAN, 6);
  });

  it('stops a flight in progress for a new pick', () => {
    const layer = create();
    layer.focus({ kind: 'project', id: 'cell' });
    runFrames(1000, 1200);
    layer.focus({ kind: 'project', id: 'sun' });
    // Only the new flight waits for a frame.
    expect(frames.size).toBe(1);
    runFrames(2000, 2200, 4000);

    const landed = screenPoint({ lat: 40, lng: -100 }, camera(), size);
    expect(landed.x).toBeCloseTo(openMiddle().x, 6);
    expect(landed.y).toBeCloseTo(openMiddle().y, 6);
  });

  it('stops a flight when the visitor drags the map', () => {
    const layer = create();
    layer.focus({ kind: 'project', id: 'cell' });
    runFrames(1000, 1200);
    fake.map().trigger('dragstart');
    expect(frames.size).toBe(0);
    const dragged = camera();
    runFrames(1400, 2500);
    expect(camera()).toEqual(dragged);
  });

  it('leaves the camera alone for a project without a marker', () => {
    const layer = create();
    const before = camera();
    layer.focus({ kind: 'project', id: 'hidden' });
    runFrames(1000, 3000);
    expect(camera()).toEqual(before);
  });

  it("fits a state's outline in the open area", () => {
    reduceMotion = true;
    const layer = create();
    layer.focus({ kind: 'state', name: 'Westland' });
    for (const corner of [
      { lat: 45, lng: -105 },
      { lat: 35, lng: -95 },
    ]) {
      expect(inOpenArea(corner)).toBe(true);
    }
    expect(camera().zoom).toBeGreaterThan(4);
  });

  it('leaves the camera alone for a state when the outlines failed to load', () => {
    const layer = create(undefined, null);
    const before = camera();
    layer.focus({ kind: 'state', name: 'Westland' });
    runFrames(1000, 3000);
    expect(camera()).toEqual(before);
  });

  it('centers on a ZIP with its nearby towns in view', () => {
    reduceMotion = true;
    const layer = create();
    const phoenix = { lat: 33.45, lng: -112.07 };
    layer.focus({ kind: 'point', point: phoenix });
    expect(span()).toBeCloseTo(ZIP_SPAN, 6);
    const landed = screenPoint(phoenix, camera(), size);
    expect(landed.x).toBeCloseTo(openMiddle().x, 6);
    expect(landed.y).toBeCloseTo(openMiddle().y, 6);
  });

  it('stops framing the lower 48 on resize once a search moves the map', () => {
    reduceMotion = true;
    const layer = create();
    layer.focus({ kind: 'project', id: 'cell' });
    const picked = camera();
    resizeTo(1024, 700);
    expect(camera()).toEqual(picked);
  });

  it('moves the camera without touching the selection', () => {
    const layer = create();
    layer.focus({ kind: 'project', id: 'sun' });
    layer.focus({ kind: 'point', point: { lat: 40, lng: -100 } });
    runFrames(1000, 3000);
    expect(onPickMarker).not.toHaveBeenCalled();
    expect(onClickMap).not.toHaveBeenCalled();
  });
});
