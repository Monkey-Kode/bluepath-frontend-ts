/**
 * ZIP Code search's one call to Google (FR-017, AC-9.5, AC-9.6). It asks once per ZIP per visit.
 * The client approved this cost on Nov 5, because a call happens only when a visitor searches.
 */
import { loadGeocoder } from '@/lib/mapsLoader';

export type ZipLookup =
  | { readonly kind: 'found'; readonly point: google.maps.LatLngLiteral }
  | { readonly kind: 'unknown' }
  /** Google failed or refused, such as when the key doesn't allow the Geocoding API. */
  | { readonly kind: 'unavailable' };

export type ZipGeocoder = Pick<google.maps.Geocoder, 'geocode'>;

/** Google's ZIP filter also matches prefixes, so only that exact ZIP counts. */
function exactZip(results: readonly google.maps.GeocoderResult[], zip: string) {
  return results.find(
    (result) =>
      result.types.includes('postal_code') &&
      result.address_components.some(
        (part) => part.types.includes('postal_code') && part.short_name === zip,
      ),
  );
}

/**
 * Returns a lookup that remembers each ZIP's answer for the visit. Two quick searches for one ZIP
 * share the first call. A failure isn't remembered, so the next search tries again.
 */
export function createZipLookup(load: () => Promise<ZipGeocoder>) {
  const answers = new Map<string, Promise<ZipLookup>>();
  let geocoder: Promise<ZipGeocoder> | null = null;

  async function ask(zip: string): Promise<ZipLookup> {
    try {
      geocoder ??= load();
      const { results } = await (await geocoder).geocode({
        componentRestrictions: { country: 'US', postalCode: zip },
        // An unknown ZIP then resolves with no results, instead of failing.
        fulfillOnZeroResults: true,
      });
      const found = exactZip(results, zip);
      return found
        ? { kind: 'found', point: found.geometry.location.toJSON() }
        : { kind: 'unknown' };
    } catch (error) {
      console.error('The ZIP lookup failed:', error);
      geocoder = null;
      answers.delete(zip);
      return { kind: 'unavailable' };
    }
  }

  return (zip: string): Promise<ZipLookup> => {
    const known = answers.get(zip);
    if (known) return known;
    const answer = ask(zip);
    answers.set(zip, answer);
    return answer;
  };
}

/** The site's one lookup, shared by every map on the page. */
export const lookupZip = createZipLookup(async () => {
  const Geocoder = await loadGeocoder();
  return new Geocoder();
});
