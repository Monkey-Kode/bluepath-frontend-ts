'use client';

import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { urlForImage } from '@/sanity/lib/utils';

type ProjectedImage = {
  asset?: {
    _id?: string | null;
    url?: string | null;
    metadata?: { lqip?: string | null } | null;
  } | null;
} | null;

type Props = Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> & {
  image: ProjectedImage;
  children?: React.ReactNode;
  /** Polymorphic element (mirrors styled-components `as`). */
  as?: React.ElementType;
  /** Background render width requested from the Sanity CDN. */
  width?: number;
  /** Fill the viewport height (`h-screen`). Used for full-bleed home sections; off elsewhere. */
  fullHeight?: boolean;
};

/**
 * LQIP blur cross-fade replacement for `gatsby-background-image`.
 * Renders the low-quality placeholder as the base `background-image`, then
 * paints the full CDN-resolution asset in an absolutely positioned <span>
 * that fades in once the browser has decoded the full image.
 */
export default function SanityBackgroundImage({
  image,
  className,
  children,
  style,
  width = 2000,
  fullHeight = false,
  as: Tag = 'div',
  ...rest
}: Props) {
  const lqip = image?.asset?.metadata?.lqip ?? undefined;
  const fullUrl = image
    ? urlForImage(image as never)
        .width(width)
        .url()
    : undefined;

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!fullUrl) return;
    const img = new Image();
    img.src = fullUrl;
    if (img.complete) {
      setLoaded(true);
      return;
    }
    img.onload = () => setLoaded(true);
    return () => {
      img.onload = null;
    };
  }, [fullUrl]);

  return (
    <Tag
      {...rest}
      className={twMerge(
        'relative flex items-center bg-cover bg-fixed bg-center bg-no-repeat [&>*:not([aria-hidden=true])]:relative [&>*:not([aria-hidden=true])]:z-[1]',
        fullHeight && 'h-screen',
        className,
      )}
      style={{
        ...style,
        ...(lqip ? { backgroundImage: `url(${lqip})` } : {}),
      }}
    >
      {fullUrl && (
        <span
          aria-hidden="true"
          data-visible={loaded}
          style={{ backgroundImage: `url(${fullUrl})` }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-0 pointer-events-none transition-opacity duration-500 ease-in-out data-[visible=true]:opacity-100"
        />
      )}
      {children}
    </Tag>
  );
}
