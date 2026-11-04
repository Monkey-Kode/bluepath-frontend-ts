import { Loader } from '@googlemaps/js-api-loader';

/**
 * The map's base look comes from this Map ID's cloud style in Google Cloud: blue land, white
 * water, and no labels. Advanced markers also need a Map ID.
 */
export const MAP_ID = 'f909f5ad32968c2a';

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  version: 'weekly',
  mapIds: [MAP_ID],
});

/** The Google Maps classes that the projects map uses. */
export interface MapsLibraries {
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
}

/** Loads Google's map and marker libraries. Later calls reuse the first load. */
export async function loadMaps(): Promise<MapsLibraries> {
  const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
    loader.importLibrary('maps'),
    loader.importLibrary('marker'),
  ]);
  return { Map, AdvancedMarkerElement };
}
