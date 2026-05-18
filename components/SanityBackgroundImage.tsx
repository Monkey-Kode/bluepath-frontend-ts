'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';

import { urlForImage } from '@/sanity/lib/utils';

type ProjectedImage = {
  asset?: {
    _id?: string | null;
    url?: string | null;
    metadata?: { lqip?: string | null } | null;
  } | null;
} | null;

const Root = styled.div`
  position: relative;
  background-position: center center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-size: cover;
  display: flex;
  align-items: center;

  /* The bg <Layer> is absolutely positioned, so it would paint above
     static-flow siblings. Lift the real content children (everything
     except the aria-hidden image layer) above it, without adding a
     wrapper element that would break the global section > div cascade. */
  & > *:not([aria-hidden='true']) {
    position: relative;
    z-index: 1;
  }
`;

const Layer = styled.div<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.5s ease;
  pointer-events: none;
`;

type Props = Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> & {
  image: ProjectedImage;
  children?: React.ReactNode;
  /** Polymorphic element (styled-components `as`). */
  as?: React.ElementType;
  /** Background render width requested from the Sanity CDN. */
  width?: number;
};

/**
 * Replaces Gatsby's `gatsby-background-image` (`StyleBackgroundImage`).
 * Renders an LQIP blur layer that cross-fades to the full CDN image on load.
 * Keeps the original fixed-attachment / cover behavior.
 */
export default function SanityBackgroundImage({
  image,
  className,
  children,
  style,
  width = 2000,
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
    <Root
      {...rest}
      className={className}
      style={{
        ...style,
        ...(lqip ? { backgroundImage: `url(${lqip})` } : {}),
      }}
    >
      {fullUrl && (
        <Layer
          aria-hidden
          $visible={loaded}
          style={{ backgroundImage: `url(${fullUrl})` }}
        />
      )}
      {children}
    </Root>
  );
}
