import React, { useMemo, useState } from 'react';
import { graphql, Link, type PageProps, type HeadProps } from 'gatsby';
import { GatsbyImage, getImage, type IGatsbyImageData } from 'gatsby-plugin-image';
import styled from 'styled-components';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const PAGE_SIZE = 10;

type SanitySlug = { current?: string | null } | null | undefined;
type SanityImage = {
  asset?: { gatsbyImageData?: IGatsbyImageData | null } | null;
} | null | undefined;

type NewsNode = {
  id: string;
  title?: string | null;
  publication?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  slug?: SanitySlug;
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

type ArchiveItem =
  | {
      kind: 'news';
      id: string;
      slug: string;
      title: string;
      label: string | null;
      excerpt: string | null;
      date: string;
      sortKey: number;
      image: ReturnType<typeof getImage> | null;
    }
  | {
      kind: 'event';
      id: string;
      slug: string;
      title: string;
      label: string | null;
      excerpt: string | null;
      date: string;
      sortKey: number;
      image: ReturnType<typeof getImage> | null;
    };

const StyledPage = styled.main`
  background: #fff;
  color: var(--blue);
  padding: calc(var(--mobile-header-height) + 1.5rem) 1.25rem 5rem;
  @media (min-width: 800px) {
    padding-top: 160px;
  }

  .archive-wrap {
    max-width: 1100px;
    margin: 0 auto;
  }

  h1.archive-heading {
    font-family: 'Lora', Georgia, serif;
    font-weight: 500;
    color: var(--blue);
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 1.1;
    margin: 0 0 2.5rem;
  }
`;

const Row = styled.article`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: flex-start;
  padding: 2rem 0;
  border-top: 1px solid rgba(0, 65, 129, 0.18);

  &:last-child {
    border-bottom: 1px solid rgba(0, 65, 129, 0.18);
  }

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .row-image {
    .gatsby-image-wrapper,
    .placeholder {
      width: 100%;
      aspect-ratio: 4 / 3;
      background: rgba(0, 65, 129, 0.08);
    }
  }

  .row-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .row-meta {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--gray2);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }

  .row-meta .label {
    color: var(--blue);
    font-weight: 600;
  }

  h2 {
    font-family: 'Lora', Georgia, serif;
    font-weight: 500;
    color: var(--blue);
    font-size: 1.875rem;
    line-height: 1.2;
    margin: 0;
    a {
      color: var(--blue);
      text-decoration: none;
      text-transform: none;
      font-weight: inherit;
      display: inline;
      padding: 0;
      &:hover {
        color: var(--orange);
      }
    }
  }

  .row-excerpt {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    color: var(--blue);
    margin: 0;
    line-height: 1.65;
  }

  .row-cta {
    margin-top: 0.5rem;
    a {
      font-family: 'Inter', Helvetica, Arial, sans-serif;
      color: var(--blue);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.8125rem;
      font-weight: 700;
      text-decoration: none;
      display: inline-block;
      padding: 0;
      &:hover {
        color: var(--orange);
      }
    }
  }
`;

const LoadMoreWrap = styled.div`
  text-align: center;
  margin-top: 3rem;

  button {
    background: transparent;
    border: 2px solid var(--blue);
    color: var(--blue);
    padding: 0.75rem 2rem;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--blue);
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
  // Sanity stores event.eventAt as a date string. Treat as midnight local.
  return `${eventAt}T00:00:00`;
};

const NewsAndEventsPage = ({
  data,
  location,
}: PageProps<NewsAndEventsData>) => {
  const items = useMemo<ArchiveItem[]>(() => {
    const newsItems: ArchiveItem[] = data.allSanityNews.nodes
      .filter((n: NewsNode) => n.slug?.current && n.publishedAt)
      .map((n: NewsNode) => ({
        kind: 'news',
        id: n.id,
        slug: n.slug!.current!,
        title: n.title ?? 'Untitled',
        label: n.publication ?? 'News',
        excerpt: n.excerpt ?? null,
        date: formatDate(n.publishedAt),
        sortKey: new Date(n.publishedAt!).getTime(),
        image: n.heroImage?.asset?.gatsbyImageData
          ? getImage(n.heroImage.asset.gatsbyImageData)
          : null,
      }));

    const eventItems: ArchiveItem[] = data.allSanityEvent.nodes
      .filter((e: EventNode) => e.slug?.current && e.eventAt)
      .map((e: EventNode) => ({
        kind: 'event',
        id: e.id,
        slug: e.slug!.current!,
        title: e.name ?? 'Untitled event',
        label: e.publication ?? 'Event',
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
              item.kind === 'news' ? 'Continue Reading' : 'View Event Details';
            return (
              <Row key={item.id}>
                <div className="row-image">
                  {item.image ? (
                    <GatsbyImage image={item.image} alt={item.title} />
                  ) : (
                    <div className="placeholder" aria-hidden />
                  )}
                </div>
                <div className="row-content">
                  <div className="row-meta">
                    <span>{item.date}</span>
                    {item.label && <span className="label">{item.label}</span>}
                  </div>
                  <h2>
                    <Link to={href}>{item.title}</Link>
                  </h2>
                  {item.excerpt && <p className="row-excerpt">{item.excerpt}</p>}
                  <div className="row-cta">
                    <Link to={href}>{ctaLabel} →</Link>
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
                Load More
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
        publication
        excerpt
        publishedAt
        slug {
          current
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
