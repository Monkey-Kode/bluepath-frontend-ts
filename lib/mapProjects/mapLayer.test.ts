import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CATEGORY_BY_KEY } from '@/lib/categories';
import { MAP_ID } from '@/lib/mapsLoader';
import { fakeMaps } from '@/test/fakeMaps';
import {
  CITY_ZOOM,
  createMapLayer,
  type LayerProject,
  ZIP_ZOOM,
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

const create = (
  projects: readonly LayerProject[] = [...plotted, ...notPlotted],
  withOutlines: StateOutlines | null = outlines,
) =>
  createMapLayer(element, fake.libraries, {
    projects,
    outlines: withOutlines,
    onPickMarker,
    onClickMap,
  });

beforeEach(() => {
  fake = fakeMaps();
  element = document.createElement('div');
  onPickMarker.mockReset();
  onClickMap.mockReset();
});

describe('markers (AC-2.1, AC-2.8)', () => {
  it('plots one marker for each plotted project and none for the rest', () => {
    create();
    expect(fake.markers.map((marker) => marker.title)).toEqual([
      'Sun Farm, Solar',
      'Cell Bank, BESS',
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

  it('frames the lower 48 states first', () => {
    create();
    const { bounds } = fake.map();
    if (!bounds) throw new Error('The map set no first view.');
    for (const place of [
      places.maine,
      places.keyWest,
      places.seattle,
      places.sanDiego,
      places.northDakota,
    ]) {
      expect(holds(bounds, place)).toBe(true);
    }
    expect(holds(bounds, places.honolulu)).toBe(false);
    expect(holds(bounds, places.anchorage)).toBe(false);
  });

  it('keeps panning and zooming within a region that holds every state', () => {
    create();
    const { restriction } = fake.map().options;
    expect(restriction?.strictBounds).toBe(true);
    const region = restriction?.latLngBounds as google.maps.LatLngBoundsLiteral;
    for (const place of Object.values(places)) {
      expect(holds(region, place)).toBe(true);
    }
    expect(holds(region, { lat: 48.9, lng: 2.35 })).toBe(false);
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

describe('the camera for a search pick (AC-9.3 to AC-9.5)', () => {
  it("centers on a project's marker at about city level", () => {
    const layer = create();
    layer.focus({ kind: 'project', id: 'cell' });
    expect(fake.map().center).toEqual({ lat: 35, lng: -90 });
    expect(fake.map().zoom).toBe(CITY_ZOOM);
    // One move, so Google never clamps the center at the old zoom first.
    expect(fake.map().cameraMoves).toBe(1);
  });

  it('leaves the camera alone for a project without a marker', () => {
    const layer = create();
    const before = fake.map().bounds;
    layer.focus({ kind: 'project', id: 'hidden' });
    expect(fake.map().center).toBeNull();
    expect(fake.map().zoom).toBeNull();
    expect(fake.map().bounds).toBe(before);
  });

  it("fits a state's outline", () => {
    const layer = create();
    layer.focus({ kind: 'state', name: 'Westland' });
    expect(fake.map().bounds).toEqual({
      west: -105,
      south: 35,
      east: -95,
      north: 45,
    });
  });

  it('leaves the camera alone for a state when the outlines failed to load', () => {
    const layer = create(undefined, null);
    const before = fake.map().bounds;
    layer.focus({ kind: 'state', name: 'Westland' });
    expect(fake.map().bounds).toBe(before);
  });

  it('centers on a ZIP with its nearby towns in view', () => {
    const layer = create();
    layer.focus({ kind: 'point', point: { lat: 33.45, lng: -112.07 } });
    expect(fake.map().center).toEqual({ lat: 33.45, lng: -112.07 });
    expect(fake.map().zoom).toBe(ZIP_ZOOM);
    expect(ZIP_ZOOM).toBeLessThan(CITY_ZOOM);
  });

  it('moves the camera without touching the selection', () => {
    const layer = create();
    layer.focus({ kind: 'project', id: 'sun' });
    layer.focus({ kind: 'point', point: { lat: 40, lng: -100 } });
    expect(onPickMarker).not.toHaveBeenCalled();
    expect(onClickMap).not.toHaveBeenCalled();
  });
});
