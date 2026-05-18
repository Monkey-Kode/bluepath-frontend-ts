'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import SanityImage from '@/components/SanityImage';
import { headerOffset } from '@/styles/mixins';
import type {
  AllEventsQueryResult,
  AllNewsQueryResult,
} from '@/sanity.types';

const PAGE_SIZE = 10;

type ArchiveImage =
  | AllNewsQueryResult[number]['heroImage']
  | AllEventsQueryResult[number]['image'];

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
  image: ArchiveImage | null;
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
    letter-spacing: 0.02em;
    font-size: var(--text-h2);
    line-height: 1.1;
    margin: 2rem 0 2.5rem;
    text-wrap: balance;

    @media (max-width: 800px) {
      margin-bottom: 0;
    }
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
    img {
      width: 100%;
      height: auto;
      object-fit: contain !important;
    }
    .placeholder {
      width: 100%;
      aspect-ratio: 273 / 387;
      background: rgba(0, 65, 129, 0.08);
    }
  }

  &.news .row-image {
    border-color: var(--accent);
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
    font-size: 1.25rem;
    padding-block-end: 0.75rem;
  }

  h2 {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h2);
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
        color: var(--accent);
      }
    }
  }

  .row-subhead {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-style: italic;
    font-weight: 400;
    font-size: 1.125rem;
    line-height: 1.4;
    color: var(--blue);
    margin: 0;
    text-wrap: balance;
  }

  .row-excerpt {
    font-family: 'Libre Baskerville', Georgia, serif;
    color: #000;
    margin: 0;
    line-height: 1.65;
    font-size: 1rem;
    max-width: 60ch;
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
        background: var(--accent);
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
      background: var(--accent);
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

export default function NewsEventsArchive({
  news,
  events,
}: {
  news: AllNewsQueryResult;
  events: AllEventsQueryResult;
}) {
  const items = useMemo<ArchiveItem[]>(() => {
    const newsItems: ArchiveItem[] = news
      .filter((n) => n.slug && n.publishedAt)
      .map((n) => ({
        kind: 'news',
        id: n._id,
        slug: n.slug as string,
        title: n.title ?? 'Untitled',
        subhead: n.subhead ?? null,
        label: n.publication ?? null,
        excerpt: n.excerpt ?? null,
        date: formatDate(n.publishedAt),
        sortKey: new Date(n.publishedAt as string).getTime(),
        image: n.featuredImage?.asset?._id
          ? n.featuredImage
          : (n.heroImage ?? null),
      }));

    const eventItems: ArchiveItem[] = events
      .filter((e) => e.slug && e.eventAt)
      .map((e) => ({
        kind: 'event',
        id: e._id,
        slug: e.slug as string,
        title: e.name ?? 'Untitled event',
        subhead: null,
        label: e.publication ?? null,
        excerpt: e.description ?? null,
        date: formatDate(eventDateToISO(e.eventAt)),
        sortKey: new Date(eventDateToISO(e.eventAt) ?? 0).getTime(),
        image: e.image ?? null,
      }));

    return [...newsItems, ...eventItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [news, events]);

  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = items.slice(0, visible);
  const hasMore = visible < items.length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <StyledPage>
      <div className="archive-wrap">
        <h1 className="archive-heading">News &amp; Events</h1>
        {shown.map((item) => {
          const href =
            item.kind === 'news'
              ? `/news/${item.slug}`
              : `/events/${item.slug}`;
          const ctaLabel =
            item.kind === 'news' ? 'CONTINUE READING' : 'VIEW EVENT DETAILS';
          return (
            <Row key={item.id} className={item.kind}>
              <Link href={href} className="row-image" aria-label={item.title}>
                {item.image?.asset?._id ? (
                  <SanityImage
                    image={item.image}
                    alt={item.title}
                    width={600}
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
                  <Link href={href}>{item.title}</Link>
                </h2>
                {item.subhead && <p className="row-subhead">{item.subhead}</p>}
                {item.excerpt && <p className="row-excerpt">{item.excerpt}</p>}
                <div className="row-cta">
                  <Link href={href}>{ctaLabel}</Link>
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
  );
}
