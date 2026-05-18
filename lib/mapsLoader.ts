import { Loader } from '@googlemaps/js-api-loader';

export const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  version: 'weekly',
  libraries: ['drawing', 'geometry', 'places', 'visualization'],
  mapIds: ['f909f5ad32968c2a'],
});
