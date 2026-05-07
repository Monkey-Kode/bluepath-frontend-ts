import React, { useMemo, useState } from 'react';
import { graphql, Link, type PageProps, type HeadProps } from 'gatsby';
import { GatsbyImage, getImage, type IGatsbyImageData } from 'gatsby-plugin-image';
import styled from 'styled-components';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { headerOffset } from '../styles/mixins';

const PAGE_SIZE = 10;

type SanitySlug = { current?: string | null } | null | undefined;
type SanityImage = {
  asset?: { gatsbyImageData?: IGatsbyImageData | null } | null;
} | null | undefined;

type NewsNode = {
  id: string;
  title?: string | null;
  subhead?: string | null;
  publication?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  slug?: SanitySlug;
  featuredImage?: SanityImage;
  heroImage?: SanityImage;
};

type EventNode = {
  id: string;
  name?: string | null;
  publication?: string | null;
  description?: string | null;
  eventAt?: string | null;
  slug?: SanitySlug;
  image?: SanityImage;
};

type NewsAndEventsData = {
  allSanityNews: { nodes: NewsNode[] };
  allSanityEvent: { nodes: EventNode[] };
};

type ArchiveItem = {
  kind: 'news' | 'event';
  id: string;
  slug: string;
  title: string;
  subhead: string | null;
  label: string | null;
  excerpt: string | null;
  date: string;
  sortKey: number;
  image: ReturnType<typeof getImage> | null;
};

const StyledPage = styled.main`
  background: #fff;
  color: var(--blue);
  ${headerOffset}
  padding-bottom: 5rem;
  padding-inline: 1.25rem;

  .archive-wrap {
    max-width: 1200px;
    margin: 0 auto;
  }

  h1.archive-heading {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-size: clamp(1.75rem, 3.5vw, 2.25rem);
    line-height: 1.1;
    margin: 0 0 2.5rem;
    text-wrap: balance;
  }
`;

const Row = styled.article`
  display: grid;
  grid-template-columns: 273px 1fr;
  gap: 2.5rem;
  align-items: flex-start;
  padding: 2.5rem 0;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .row-image {
    display: block;
    width: 100%;
    max-width: 273px;
    padding: 0;
    border: 1px solid var(--blue);
    line-height: 0;
    .gatsby-image-wrapper {
      width: 100%;
      height: auto;
    }
    .gatsby-image-wrapper img {
      object-fit: contain !important;
    }
    .placeholder {
      width: 100%;
      aspect-ratio: 273 / 387;
      background: rgba(0, 65, 129, 0.08);
    }
  }

  &.news .row-image {
    border-color: var(--orange);
  }

  .row-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .row-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .row-date {
    color: var(--blue);
    font-weight: 300;
    font-style: italic;
  }

  .row-publication {
    color: var(--blue);
    font-weight: 600;
    font-style: italic;
  }

  h2 {
    font-family: 'Lora', Georgia, serif;
    font-weight: 700;
    color: var(--blue);
    font-size: clamp(1.75rem, 2.5vw, 2.25rem);
    line-height: 1.2;
    margin: 0;
    text-wrap: balance;
    a {
      color: var(--blue);
      text-decoration: none;
      text-transform: none;
      font-weight: inherit;
      padding: 0;
      display: inline;
      transition: color 0.3s ease;
      &:hover {
        color: var(--orange);
      }
    }
  }

  .row-subhead {
    font-family: 'Lora', Georgia, serif;
    font-style: italic;
    font-weight: 400;
    font-size: 1.125rem;
    line-height: 1.4;
    color: var(--blue);
    margin: 0;
    text-wrap: balance;
  }

  .row-excerpt {
    font-family: 'Lora', Georgia, serif;
    color: #000;
    margin: 0;
    line-height: 1.65;
    font-size: 1rem;
  }

  .row-cta {
    margin-top: 0.5rem;
    a {
      display: inline-block;
      background: var(--blue);
      color: #fff;
      font-family: 'Inter', Helvetica, Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.8125rem;
      font-weight: 400;
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      transition: background-color 0.2s ease;
      &:hover {
        background: var(--orange);
        color: #fff;
      }
    }
  }
`;

const LoadMoreWrap = styled.div`
  text-align: center;
  margin-top: 3rem;

  button {
    background: var(--blue);
    border: none;
    border-radius: 6px;
    color: #fff;
    padding: 0.5rem 0.75rem;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.8125rem;
    font-weight: 400;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--orange);
      color: #fff;
    }
  }
`;

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const eventDateToISO = (eventAt: string | null | undefined) => {
  if (!eventAt) return null;
  return `${eventAt}T00:00:00`;
};

const NewsAndEventsPage = ({
  data,
  location,
}: PageProps<NewsAndEventsData>) => {
  const items = useMemo<ArchiveItem[]>(() => {
    const newsItems: ArchiveItem[] = data.allSanityNews.nodes
      .filter((n: NewsNode) => n.slug?.current && n.publishedAt)
      .map((n: NewsNode) => {
        const archiveImage =
          n.featuredImage?.asset?.gatsbyImageData ??
          n.heroImage?.asset?.gatsbyImageData ??
          null;
        return {
          kind: 'news',
          id: n.id,
          slug: n.slug!.current!,
          title: n.title ?? 'Untitled',
          subhead: n.subhead ?? null,
          label: n.publication ?? null,
          excerpt: n.excerpt ?? null,
          date: formatDate(n.publishedAt),
          sortKey: new Date(n.publishedAt!).getTime(),
          image: archiveImage ? getImage(archiveImage) : null,
        };
      });

    const eventItems: ArchiveItem[] = data.allSanityEvent.nodes
      .filter((e: EventNode) => e.slug?.current && e.eventAt)
      .map((e: EventNode) => ({
        kind: 'event',
        id: e.id,
        slug: e.slug!.current!,
        title: e.name ?? 'Untitled event',
        subhead: null,
        label: e.publication ?? null,
        excerpt: e.description ?? null,
        date: formatDate(eventDateToISO(e.eventAt)),
        sortKey: new Date(eventDateToISO(e.eventAt) ?? 0).getTime(),
        image: e.image?.asset?.gatsbyImageData
          ? getImage(e.image.asset.gatsbyImageData)
          : null,
      }));

    return [...newsItems, ...eventItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [data]);

  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = items.slice(0, visible);
  const hasMore = visible < items.length;

  return (
    <div>
      <Header location={location} />
      <StyledPage>
        <div className="archive-wrap">
          <h1 className="archive-heading">News &amp; Events</h1>
          {shown.map((item) => {
            const href =
              item.kind === 'news' ? `/news/${item.slug}` : `/events/${item.slug}`;
            const ctaLabel =
              item.kind === 'news' ? 'CONTINUE READING' : 'VIEW EVENT DETAILS';
            return (
              <Row key={item.id} className={item.kind}>
                <Link to={href} className="row-image" aria-label={item.title}>
                  {item.image ? (
                    <GatsbyImage
                      image={item.image}
                      alt={item.title}
                      objectFit="contain"
                    />
                  ) : (
                    <div className="placeholder" aria-hidden />
                  )}
                </Link>
                <div className="row-content">
                  <div className="row-meta">
                    {item.date && <span className="row-date">{item.date}</span>}
                    {item.label && (
                      <span className="row-publication">{item.label}</span>
                    )}
                  </div>
                  <h2>
                    <Link to={href}>{item.title}</Link>
                  </h2>
                  {item.subhead && (
                    <p className="row-subhead">{item.subhead}</p>
                  )}
                  {item.excerpt && <p className="row-excerpt">{item.excerpt}</p>}
                  <div className="row-cta">
                    <Link to={href}>{ctaLabel}</Link>
                  </div>
                </div>
              </Row>
            );
          })}
          {hasMore && (
            <LoadMoreWrap>
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                LOAD MORE
              </button>
            </LoadMoreWrap>
          )}
        </div>
      </StyledPage>
      <Footer location={location} />
    </div>
  );
};

export const Head = ({ location }: HeadProps) => (
  <SEO
    title="News & Events"
    description="The latest news, press, and events from BluePath Finance."
    location={location as Location}
  />
);

export const query = graphql`
  query NewsAndEvents {
    allSanityNews {
      nodes {
        id
        title
        subhead
        publication
        excerpt
        publishedAt
        slug {
          current
        }
        featuredImage {
          asset {
            gatsbyImageData(width: 600, layout: CONSTRAINED, placeholder: BLURRED)
          }
        }
        heroImage {
          asset {
            gatsbyImageData(width: 600, layout: CONSTRAINED, placeholder: BLURRED)
          }
        }
      }
    }
    allSanityEvent {
      nodes {
        id
        name
        publication
        description
        eventAt
        slug {
          current
        }
        image {
          asset {
            gatsbyImageData(width: 600, layout: CONSTRAINED, placeholder: BLURRED)
          }
        }
      }
    }
  }
`;

export default NewsAndEventsPage;
