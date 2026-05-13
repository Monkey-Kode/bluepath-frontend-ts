import React from 'react';
import { PortableText, type PortableTextComponents } from '@portabletext/react';
import styled from 'styled-components';
import getYouTubeId from 'get-youtube-id';

const StyledArticleBody = styled.div`
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  color: #000;
  line-height: 1;
  font-size: 1rem;

  p {
    color: #000;
    margin: 0 0 1rem;
    line-height: 1.5;
  }

  a {
    color: #000;
    text-decoration: underline;
    text-transform: none;
    font-weight: 500;
    display: inline;
    padding: 0;
    &:hover {
      color: var(--orange);
    }
  }

  h2,
  h3 {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    color: #000;
    margin: 1.75rem 0 0.5rem;
    line-height: 1.5;
    font-weight: 600;
  }
  h2 {
    font-size: var(--text-h2);
  }
  h3 {
    font-size: var(--text-h3);
  }

  ul,
  ol {
    margin: 0 0 1rem 1.25rem;
    padding: 0;
    line-height: 1.5;
  }
  li {
    margin-bottom: 0.4rem;
    color: #000;
    line-height: 1.5;
  }

  blockquote {
    margin: 1.5rem 0;
    padding: 0 0 0 1.25rem;
    border-left: 3px solid var(--orange);
    font-style: italic;
    color: #000;
  }

  strong {
    font-weight: 600;
  }

  .callout {
    color: #000;
    font-weight: 700;
  }
`;

const PullQuote = styled.figure`
  margin: 2rem 0;
  padding: 1.5rem 1.5rem 1.5rem 2rem;
  border-left: 4px solid var(--orange);
  font-family: 'Libre Baskerville', Georgia, serif;
  font-size: 1.5rem;
  line-height: 1.4;
  color: var(--blue);
  font-style: italic;
  blockquote {
    margin: 0;
    padding: 0;
    border: none;
    color: inherit;
    font-style: inherit;
  }
  figcaption {
    margin-top: 0.75rem;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 0.875rem;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--gray2);
  }
`;

const InlineFigure = styled.figure`
  margin: 2rem 0;
  img {
    width: 100%;
    height: auto;
    display: block;
  }
  figcaption {
    margin-top: 0.5rem;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 0.875rem;
    color: var(--gray2);
    text-align: center;
  }
`;

const VideoEmbed = styled.div`
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  margin: 2rem 0;
  iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

type SanityImageAsset = {
  url?: string | null;
  altText?: string | null;
} | null | undefined;

type SanityImageRef = {
  asset?: SanityImageAsset;
} | null | undefined;

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
    callout: ({ children }) => <span className="callout">{children}</span>,
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
      <PullQuote>
        <blockquote>{value?.quote}</blockquote>
        {value?.attribution && <figcaption>— {value.attribution}</figcaption>}
      </PullQuote>
    ),
    imageWithCaption: ({ value }) => {
      const url = imageUrlFor(value?.image);
      if (!url) return null;
      return (
        <InlineFigure>
          <img src={url} alt={value?.alt ?? ''} />
          {value?.caption && <figcaption>{value.caption}</figcaption>}
        </InlineFigure>
      );
    },
    youtube: ({ value }) => {
      const id = value?.url ? getYouTubeId(value.url) : null;
      if (!id) return null;
      return (
        <VideoEmbed>
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </VideoEmbed>
      );
    },
  },
};

const NewsBody = ({ value }: { value: unknown }) => (
  <StyledArticleBody>
    <PortableText value={value as never} components={newsBodyComponents} />
  </StyledArticleBody>
);

export default NewsBody;
