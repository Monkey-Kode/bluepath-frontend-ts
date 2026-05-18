import {
  createImageUrlBuilder,
  type SanityImageSource,
} from '@sanity/image-url';
import { createDataAttribute, type CreateDataAttributeProps } from 'next-sanity';

import { dataset, projectId, studioUrl } from '@/sanity/lib/api';

const builder = createImageUrlBuilder({ projectId, dataset });

export function urlForImage(source: SanityImageSource) {
  return builder.image(source).auto('format').fit('max');
}

export function resolveOpenGraphImage(
  image?: SanityImageSource | null,
  width = 1200,
  height = 630,
) {
  if (!image) return undefined;
  const url = builder
    .image(image)
    .width(width)
    .height(height)
    .fit('crop')
    .url();
  if (!url) return undefined;
  return { url, width, height };
}

type DataAttributeConfig = CreateDataAttributeProps &
  Required<Pick<CreateDataAttributeProps, 'id' | 'type' | 'path'>>;

export function dataAttr(config: DataAttributeConfig) {
  return createDataAttribute({
    projectId,
    dataset,
    baseUrl: studioUrl,
  }).combine(config);
}
