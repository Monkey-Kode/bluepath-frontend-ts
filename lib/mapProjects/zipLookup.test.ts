import { afterEach, describe, expect, it, vi } from 'vitest';
import { createZipLookup, type ZipGeocoder } from './zipLookup';

type Results = google.maps.GeocoderResult[];

const result = (
  zip: string,
  point: google.maps.LatLngLiteral,
  types = ['postal_code'],
) =>
  ({
    types,
    address_components: [
      { long_name: zip, short_name: zip, types: ['postal_code'] },
    ],
    geometry: { location: { toJSON: () => point } },
  }) as unknown as google.maps.GeocoderResult;

const PHOENIX = { lat: 33.49, lng: -112.21 };

function setup(respond: () => Promise<Results>) {
  const geocode = vi.fn(async () => ({ results: await respond() }));
  const geocoder = { geocode } as unknown as ZipGeocoder;
  const load = vi.fn(async () => geocoder);
  return { geocode, load, lookup: createZipLookup(load) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ZIP lookup (AC-9.5, AC-9.6)', () => {
  it('finds a US ZIP, and treats an empty answer as a reply rather than a failure', async () => {
    const { geocode, lookup } = setup(async () => [result('85033', PHOENIX)]);

    expect(await lookup('85033')).toEqual({ kind: 'found', point: PHOENIX });
    expect(geocode).toHaveBeenCalledWith({
      componentRestrictions: { country: 'US', postalCode: '85033' },
      fulfillOnZeroResults: true,
    });
  });

  it('asks Google once per ZIP, even while the first answer is on its way', async () => {
    const { geocode, lookup } = setup(async () => [result('85033', PHOENIX)]);

    const [first, second] = await Promise.all([
      lookup('85033'),
      lookup('85033'),
    ]);
    await lookup('85033');

    expect(first).toEqual(second);
    expect(geocode).toHaveBeenCalledOnce();
  });

  it('loads the geocoder only when the first ZIP is looked up', async () => {
    const { load, lookup } = setup(async () => [result('85033', PHOENIX)]);
    expect(load).not.toHaveBeenCalled();

    await lookup('85033');
    await lookup('10001');

    expect(load).toHaveBeenCalledOnce();
  });

  it('reports an unknown ZIP when Google finds nothing', async () => {
    const { lookup } = setup(async () => []);
    expect(await lookup('00000')).toEqual({ kind: 'unknown' });
  });

  it('ignores a result that is not that exact ZIP', async () => {
    const { lookup } = setup(async () => [
      result('85034', PHOENIX),
      result('85033', PHOENIX, ['country', 'political']),
    ]);
    expect(await lookup('85033')).toEqual({ kind: 'unknown' });
  });

  it('reports a failed lookup, and asks again on the next try', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    const { geocode, lookup } = setup(async () => {
      if (fail) throw new Error('OVER_QUERY_LIMIT');
      return [result('85033', PHOENIX)];
    });

    expect(await lookup('85033')).toEqual({ kind: 'unavailable' });
    expect(error).toHaveBeenCalled();
    fail = false;
    expect(await lookup('85033')).toEqual({ kind: 'found', point: PHOENIX });
    expect(geocode).toHaveBeenCalledTimes(2);
  });

  it('reports a failed load as unavailable, and loads again on the next try', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const geocoder = {
      geocode: vi.fn(async () => ({ results: [result('85033', PHOENIX)] })),
    } as unknown as ZipGeocoder;
    const load = vi
      .fn<() => Promise<ZipGeocoder>>()
      .mockRejectedValueOnce(new Error('ApiNotActivatedMapError'))
      .mockResolvedValue(geocoder);
    const lookup = createZipLookup(load);

    expect(await lookup('85033')).toEqual({ kind: 'unavailable' });
    expect(await lookup('85033')).toEqual({ kind: 'found', point: PHOENIX });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
