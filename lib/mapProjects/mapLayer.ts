/**
 * The Google map behind the projects map (FR-002, FR-003, AC-2.10). It draws the markers, the
 * state outlines, and the mask. `components/Projects.tsx` owns the selection and calls `show`
 * after each change. Tests pass the fake classes from `test/fakeMaps.ts`.
 *
 * The base look, blue land and white water with no labels, comes from the Map ID's cloud style
 * in Google Cloud, not from this code.
 */
import { CATEGORY_BY_KEY, categoryOf } from '@/lib/categories';
import { MAP_ID, type MapsLibraries } from '@/lib/mapsLoader';
import {
  type Camera,
  cameraAlong,
  cameraForBounds,
  centerFor,
  type Padding,
  zoomForSpan,
} from './camera';
import { displayName, isPlotted, type MapProject } from './display';
import { boundsOf, type StateOutlines } from './outlines';
import { markerLook, type PickedProject, type Selection } from './selection';
import { countByState, shadeFor } from './shading';

export interface LayerProject extends MapProject {
  id: string;
}

export interface MapLayerOptions {
  /** Every project. The layer plots only those that `isPlotted` accepts. */
  projects: readonly LayerProject[];
  /** Null when the outlines failed to load. The map then shows no shading and no mask. */
  outlines: StateOutlines | null;
  onPickMarker: (project: PickedProject) => void;
  /** A click on the map that hits no marker. */
  onClickMap: () => void;
  /** How far the search, panel, key, and legend reach over each edge of the map, in pixels. */
  padding: () => Padding;
}

/** Where a search pick moves the map (AC-9.3 to AC-9.5). */
export type FocusTarget =
  | { readonly kind: 'project'; readonly id: string }
  | { readonly kind: 'state'; readonly name: string }
  | { readonly kind: 'point'; readonly point: google.maps.LatLngLiteral };

export interface MapLayer {
  show(selection: Selection): void;
  /** Flies to the target. Under reduced motion, it jumps (NFR-002). */
  focus(target: FocusTarget): void;
  destroy(): void;
}

/**
 * About one large state's width in degrees of longitude, across the open area's typical side. A
 * picked project then shows with the markers around it on any screen (D-43).
 */
export const STATE_SPAN = 12;

/** A searched ZIP with the towns around it (AC-9.5). */
export const ZIP_SPAN = 5;

/** A small state, such as Rhode Island, stops at this zoom. */
const STATE_MAX_ZOOM = 9;

/** How long a search pick's flight takes. */
const FLIGHT_MS = 1200;

/** The first view (AC-2.10). */
const LOWER_48: google.maps.LatLngBoundsLiteral = {
  south: 24.4,
  west: -124.8,
  north: 49.4,
  east: -66.9,
};

/**
 * Panning and zooming stay inside this region (AC-2.10). Alaska's Aleutians cross the
 * antimeridian, so west is greater than east. The mask reaches past every edge, so the white
 * surround never ends. The south edge leaves room to center the lower 48 above a phone's legend,
 * where the map's middle sits far south of the lower 48. The east and west edges sit about 114
 * degrees either side of the lower 48's middle. That leaves room for a wide, short open area,
 * such as a 1440 px window with the map at its minimum height. A narrower region makes Google
 * clamp the first view, and the UI covers part of the lower 48.
 */
const US_REGION: google.maps.LatLngBoundsLiteral = {
  south: -35,
  west: 150,
  north: 80,
  east: 18,
};

const SURROUND = '#ffffff';

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whether two cameras match, give or take rounding in Google's own copy. */
const sameCamera = (a: Camera, b: Camera | null) =>
  b !== null &&
  Math.abs(a.zoom - b.zoom) < 1e-6 &&
  Math.abs(a.center.lat - b.center.lat) < 1e-6 &&
  Math.abs(a.center.lng - b.center.lng) < 1e-6;

/** A selected marker draws above every other marker. */
const SELECTED_Z = 1000;

/** `data-look` holds the look from `markerLook`. Reduced motion skips the scale and the fade. */
const DOT_CLASSES =
  'block size-2.5 rounded-full ring-1 ring-white/60 motion-safe:transition data-[look=dimmed]:opacity-30 data-[look=selected]:scale-160';

export function createMapLayer(
  element: HTMLElement,
  { Map, AdvancedMarkerElement }: MapsLibraries,
  { projects, outlines, onPickMarker, onClickMap, padding }: MapLayerOptions,
): MapLayer {
  const map = new Map(element, {
    mapId: MAP_ID,
    // One finger scrolls the page. Two fingers, or Ctrl with the wheel, move the map (AC-2.9).
    gestureHandling: 'cooperative',
    clickableIcons: false,
    // The design shows no map controls. The zoom buttons stay for pointer users.
    disableDefaultUI: true,
    zoomControl: true,
    restriction: { latLngBounds: US_REGION, strictBounds: true },
    // The lower 48 fill the open area exactly, and a flight moves smoothly.
    isFractionalZoomEnabled: true,
  });
  const sizeOf = () => ({
    width: element.clientWidth,
    height: element.clientHeight,
  });

  const cameraNow = (): Camera | null => {
    const center = map.getCenter()?.toJSON();
    const zoom = map.getZoom();
    return center && zoom !== undefined ? { center, zoom } : null;
  };

  let flight: number | null = null;
  const stopFlight = () => {
    if (flight !== null) cancelAnimationFrame(flight);
    flight = null;
  };

  // The first view follows the map's size until the visitor or a search moves the map. Only a drag
  // fires an event. The zoom buttons, the keyboard, and Ctrl with the wheel show up as a camera
  // that differs from the last refit's.
  let moved = false;
  let framed: Camera | null = null;
  const frame = () => {
    const size = sizeOf();
    if (moved || size.width === 0 || size.height === 0) return;
    if (framed && !sameCamera(framed, cameraNow())) {
      moved = true;
      return;
    }
    map.moveCamera(cameraForBounds(LOWER_48, size, padding()));
    framed = cameraNow();
  };
  frame();
  const resizes =
    typeof ResizeObserver === 'function' ? new ResizeObserver(frame) : null;
  resizes?.observe(element);
  const drags = map.addListener('dragstart', () => {
    moved = true;
    stopFlight();
  });
  const fly = (to: Camera) => {
    moved = true;
    stopFlight();
    const from = cameraNow();
    if (reducedMotion() || !from) {
      map.moveCamera(to);
      return;
    }
    let start: number | null = null;
    const step = (time: number) => {
      start ??= time;
      const t = Math.min(1, (time - start) / FLIGHT_MS);
      map.moveCamera(t < 1 ? cameraAlong(from, to, t, sizeOf()) : to);
      flight = t < 1 ? requestAnimationFrame(step) : null;
    };
    flight = requestAnimationFrame(step);
  };

  if (outlines) drawOutlines(map, outlines, projects);

  const markers = projects.filter(isPlotted).flatMap((project) => {
    const category = categoryOf(project);
    if (!category) return [];
    const { color, label } = CATEGORY_BY_KEY[category];
    // Google gets plain coordinates, without Sanity's `_type` on a geopoint.
    const position = { lat: project.location.lat, lng: project.location.lng };
    const dot = document.createElement('span');
    dot.className = DOT_CLASSES;
    dot.style.backgroundColor = color;
    const marker = new AdvancedMarkerElement({
      map,
      position,
      title: `${displayName(project)}, ${label}`,
      content: dot,
      // A clickable marker takes Tab, the arrow keys, Enter, and Space (AC-2.8).
      gmpClickable: true,
      // Centers the dot on its position. Google's default anchor is the bottom center.
      anchorTop: '-50%',
    });
    const picked = { id: project.id, category };
    marker.addEventListener('gmp-click', () => onPickMarker(picked));
    return [{ marker, dot, picked, position }];
  });

  const clicks = map.addListener(
    'click',
    (event: google.maps.MapMouseEvent) => {
      // Google may pass a marker click on to the map. Only a click on empty map clears.
      const target = event.domEvent?.target;
      if (
        target instanceof Node &&
        markers.some(({ marker }) => marker.contains(target))
      )
        return;
      onClickMap();
    },
  );

  return {
    show(selection) {
      for (const { marker, dot, picked } of markers) {
        const look = markerLook(selection, picked);
        dot.dataset.look = look;
        marker.zIndex = look === 'selected' ? SELECTED_Z : null;
        const shownOn = look === 'hidden' ? null : map;
        if (marker.map !== shownOn) marker.map = shownOn;
      }
    },
    focus(target) {
      if (target.kind === 'state') {
        const bounds = outlines && boundsOf(outlines, target.name);
        if (bounds)
          fly(cameraForBounds(bounds, sizeOf(), padding(), STATE_MAX_ZOOM));
        return;
      }
      const point =
        target.kind === 'point'
          ? target.point
          : markers.find(({ picked }) => picked.id === target.id)?.position;
      if (!point) return;
      const zoom = zoomForSpan(
        target.kind === 'point' ? ZIP_SPAN : STATE_SPAN,
        sizeOf(),
        padding(),
      );
      // Each move sets the center and the zoom together, so the map's bounds never clamp the
      // center at the old zoom first.
      fly({ center: centerFor(point, zoom, padding()), zoom });
    },
    destroy() {
      stopFlight();
      resizes?.disconnect();
      drags.remove();
      clicks.remove();
      for (const { marker } of markers) marker.map = null;
    },
  };
}

function drawOutlines(
  map: google.maps.Map,
  outlines: StateOutlines,
  projects: readonly MapProject[],
) {
  // The counts never see a legend filter, so the shading stays fixed (AC-2.2).
  const counts = countByState(outlines, projects);
  map.data.addGeoJson(outlines);
  // `clickable: false` lets a click on a state or the mask reach the map and clear the selection.
  map.data.setStyle((feature) => {
    if (feature.getProperty('mask') === true)
      return {
        fillColor: SURROUND,
        fillOpacity: 1,
        strokeWeight: 0,
        clickable: false,
      };
    const name = feature.getProperty('name');
    const shade = shadeFor(
      typeof name === 'string' ? (counts.get(name) ?? 0) : 0,
    );
    return {
      // A state with no projects shows the Map ID's base land.
      fillColor: shade ?? SURROUND,
      fillOpacity: shade ? 1 : 0,
      strokeColor: SURROUND,
      strokeOpacity: 0.6,
      strokeWeight: 1,
      clickable: false,
    };
  });
}
