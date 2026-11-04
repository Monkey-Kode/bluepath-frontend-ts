/**
 * Stand-ins for the Google Maps classes that `lib/mapProjects/mapLayer.ts` uses. Tests drive the
 * projects map through them without loading Google's script. Each `fakeMaps()` call records its
 * own maps and markers.
 */
import type { MapsLibraries } from '@/lib/mapsLoader';

type Handler = (event?: unknown) => void;
type Style = google.maps.Data.StylingFunction | google.maps.Data.StyleOptions;

export class FakeData {
  readonly added: object[] = [];
  private style: Style = {};

  addGeoJson(geoJson: object) {
    this.added.push(geoJson);
    return [];
  }

  setStyle(style: Style) {
    this.style = style;
  }

  /** The style that a feature with these properties gets. */
  styleOf(properties: Record<string, unknown>): google.maps.Data.StyleOptions {
    const feature = {
      getProperty: (name: string) => properties[name],
    } as google.maps.Data.Feature;
    return typeof this.style === 'function' ? this.style(feature) : this.style;
  }
}

export class FakeMap {
  readonly element: HTMLElement;
  readonly options: google.maps.MapOptions;
  readonly data = new FakeData();
  bounds: google.maps.LatLngBoundsLiteral | null = null;
  private readonly handlers = new Map<string, Set<Handler>>();

  constructor(element: HTMLElement, options: google.maps.MapOptions) {
    this.element = element;
    this.options = options;
  }

  addListener(name: string, handler: Handler) {
    const handlers = this.handlers.get(name) ?? new Set<Handler>();
    this.handlers.set(name, handlers.add(handler));
    return { remove: () => void handlers.delete(handler) };
  }

  fitBounds(bounds: google.maps.LatLngBoundsLiteral) {
    this.bounds = bounds;
  }

  /** Fires a map event, as Google does for a click, a drag, or a zoom. */
  trigger(name: string, event?: unknown) {
    for (const handler of this.handlers.get(name) ?? []) handler(event);
  }

  listenerCount(name: string) {
    return this.handlers.get(name)?.size ?? 0;
  }
}

export class FakeMarker extends HTMLElement {
  map: FakeMap | null;
  position: google.maps.LatLngLiteral;
  zIndex: number | null;
  gmpClickable: boolean;
  anchorTop: string | null;
  /** The content element, which shows the marker's color and look. */
  readonly dot: HTMLElement;

  constructor(options: google.maps.marker.AdvancedMarkerElementOptions) {
    super();
    if (!(options.content instanceof HTMLElement))
      throw new Error('A fake marker needs an element as its content.');
    this.map = options.map as unknown as FakeMap | null;
    this.position = options.position as google.maps.LatLngLiteral;
    this.title = options.title ?? '';
    this.zIndex = options.zIndex ?? null;
    this.gmpClickable = options.gmpClickable ?? false;
    this.anchorTop = options.anchorTop ?? null;
    this.dot = options.content;
    this.append(this.dot);
  }

  get look() {
    return this.dot.dataset.look;
  }

  /** Picks the marker, as Google does after a click, Enter, or Space. */
  pick() {
    this.dispatchEvent(new Event('gmp-click'));
  }
}

let defined = 0;

export function fakeMaps() {
  const maps: FakeMap[] = [];
  const markers: FakeMarker[] = [];

  class TrackedMap extends FakeMap {
    constructor(element: HTMLElement, options: google.maps.MapOptions) {
      super(element, options);
      maps.push(this);
    }
  }

  class TrackedMarker extends FakeMarker {
    constructor(options: google.maps.marker.AdvancedMarkerElementOptions) {
      super(options);
      markers.push(this);
    }
  }
  customElements.define(`fake-advanced-marker-${++defined}`, TrackedMarker);

  return {
    libraries: {
      Map: TrackedMap,
      AdvancedMarkerElement: TrackedMarker,
    } as unknown as MapsLibraries,
    maps,
    markers,
    /** The one map that the layer made. */
    map() {
      if (maps.length !== 1)
        throw new Error(`Expected one map, found ${maps.length}.`);
      return maps[0];
    },
    /** The marker whose accessible name starts with the project's name. */
    marker(name: string) {
      const found = markers.find((marker) =>
        marker.title.startsWith(`${name}, `),
      );
      if (!found) throw new Error(`No marker is named ${name}.`);
      return found;
    },
  };
}
