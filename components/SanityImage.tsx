import {
  SanityImage as BaseSanityImage,
  type SanityImageProps,
} from 'sanity-image';

import { dataset, projectId } from '@/sanity/lib/api';

const baseUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/`;

type ProjectedImage = {
  asset?: {
    _id?: string | null;
    metadata?: { lqip?: string | null } | null;
  } | null;
  hotspot?: SanityImageProps<'img'>['hotspot'];
  crop?: SanityImageProps<'img'>['crop'];
  alt?: string | null;
} | null;

type Props = Omit<
  SanityImageProps<'img'>,
  'id' | 'baseUrl' | 'hotspot' | 'crop' | 'preview' | 'alt'
> & {
  image: ProjectedImage;
  alt?: string | null;
};

/**
 * Thin wrapper over `sanity-image` that takes a GROQ-projected image object
 * (`{ asset->{ _id, metadata{lqip} }, hotspot, crop, alt }`) and renders a
 * single CDN-backed `<img>`. Replaces Gatsby's `<GatsbyImage>`.
 */
export default function SanityImage({ image, alt, ...props }: Props) {
  const id = image?.asset?._id;
  if (!id) return null;

  return (
    <BaseSanityImage
      id={id}
      baseUrl={baseUrl}
      hotspot={image?.hotspot ?? undefined}
      crop={image?.crop ?? undefined}
      preview={image?.asset?.metadata?.lqip ?? undefined}
      alt={alt ?? image?.alt ?? ''}
      {...props}
    />
  );
}
