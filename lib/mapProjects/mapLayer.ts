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
import { displayName, isPlotted, type MapProject } from './display';
import type { StateOutlines } from './outlines';
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
}

export interface MapLayer {
  show(selection: Selection): void;
  destroy(): void;
}

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
 * surround never ends. The south edge leaves room to center the lower 48 on a tall map.
 */
const US_REGION: google.maps.LatLngBoundsLiteral = {
  south: 0,
  west: 150,
  north: 80,
  east: -40,
};

const SURROUND = '#ffffff';

/** A selected marker draws above every other marker. */
const SELECTED_Z = 1000;

/** `data-look` holds the look from `markerLook`. Reduced motion skips the scale and the fade. */
const DOT_CLASSES =
  'block size-2.5 rounded-full ring-1 ring-white/60 motion-safe:transition data-[look=dimmed]:opacity-30 data-[look=selected]:scale-160';

export function createMapLayer(
  element: HTMLElement,
  { Map, AdvancedMarkerElement }: MapsLibraries,
  { projects, outlines, onPickMarker, onClickMap }: MapLayerOptions,
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
  });
  map.fitBounds(LOWER_48);

  if (outlines) drawOutlines(map, outlines, projects);

  const markers = projects.filter(isPlotted).flatMap((project) => {
    const category = categoryOf(project);
    if (!category) return [];
    const { color, label } = CATEGORY_BY_KEY[category];
    const dot = document.createElement('span');
    dot.className = DOT_CLASSES;
    dot.style.backgroundColor = color;
    const marker = new AdvancedMarkerElement({
      map,
      position: project.location,
      title: `${displayName(project)}, ${label}`,
      content: dot,
      // A clickable marker takes Tab, the arrow keys, Enter, and Space (AC-2.8).
      gmpClickable: true,
      // Centers the dot on its position. Google's default anchor is the bottom center.
      anchorTop: '-50%',
    });
    const picked = { id: project.id, category };
    marker.addEventListener('gmp-click', () => onPickMarker(picked));
    return [{ marker, dot, picked }];
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
    destroy() {
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
