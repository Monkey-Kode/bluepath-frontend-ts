'use client';

import { PortableText, type PortableTextComponents } from '@portabletext/react';
import getYouTubeId from 'get-youtube-id';

type SanityImageAsset =
  | {
      url?: string | null;
      altText?: string | null;
    }
  | null
  | undefined;

type SanityImageRef =
  | {
      asset?: SanityImageAsset;
    }
  | null
  | undefined;

const imageUrlFor = (image: SanityImageRef): string | null =>
  image?.asset?.url ?? null;

export const newsBodyComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    normal: ({ children }) => <p>{children}</p>,
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    link: ({ value, children }) => {
      const href = value?.href ?? '#';
      const target = value?.blank ? '_blank' : undefined;
      const rel = value?.blank ? 'noopener noreferrer' : undefined;
      return (
        <a href={href} target={target} rel={rel}>
          {children}
        </a>
      );
    },
    internalLink: ({ value, children }) => {
      const slug = value?.reference?.slug?.current;
      const type = value?.reference?._type;
      const prefix =
        type === 'news' ? '/news/' : type === 'event' ? '/events/' : '/';
      return <a href={slug ? `${prefix}${slug}` : '#'}>{children}</a>;
    },
  },
  types: {
    pullQuote: ({ value }) => (
      <figure className="not-prose my-8 border-l-4 border-accent py-6 pl-8 pr-6 font-serif text-2xl italic leading-[1.4] text-blue [&_blockquote]:m-0 [&_blockquote]:border-0 [&_blockquote]:p-0 [&_blockquote]:text-inherit [&_blockquote]:italic [&_figcaption]:mt-3 [&_figcaption]:font-sans [&_figcaption]:text-sm [&_figcaption]:not-italic [&_figcaption]:uppercase [&_figcaption]:tracking-[0.08em] [&_figcaption]:text-[var(--color-gray-2)]">
        <blockquote>{value?.quote}</blockquote>
        {value?.attribution && <figcaption>— {value.attribution}</figcaption>}
      </figure>
    ),
    imageWithCaption: ({ value }) => {
      const url = imageUrlFor(value?.image);
      if (!url) return null;
      return (
        <figure className="not-prose my-8 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:font-sans [&_figcaption]:text-sm [&_figcaption]:text-[var(--color-gray-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={value?.alt ?? ''} />
          {value?.caption && <figcaption>{value.caption}</figcaption>}
        </figure>
      );
    },
    youtube: ({ value }) => {
      const id = value?.url ? getYouTubeId(value.url) : null;
      if (!id) return null;
      return (
        <div className="not-prose relative my-8 h-0 pb-[56.25%] [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    },
    divider: () => (
      <hr className="not-prose my-10 border-0 border-t border-[var(--color-gray-3,#d0d0d0)]" />
    ),
  },
};

const NewsBody = ({ value }: { value: unknown }) => (
  <PortableText value={value as never} components={newsBodyComponents} />
);

export default NewsBody;
