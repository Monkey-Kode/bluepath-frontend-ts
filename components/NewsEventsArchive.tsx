'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import SanityImage from '@/components/SanityImage';
import type { AllEventsQueryResult, AllNewsQueryResult } from '@/sanity.types';

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

const eventDateToISO = (eventAt: string | null | undefined) =>
  eventAt ? `${eventAt}T00:00:00` : null;

const CTA_CLASS =
  'inline-block bg-blue text-white  uppercase tracking-[0.12em] text-[0.8125rem] font-normal no-underline px-3 py-2 rounded-md transition-colors duration-200 hover:bg-accent hover:text-white';

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
    <main className="header-offset bg-white text-blue pb-20">
      <div className="mx-auto max-w-7xl px-5">
        <h1 className="font-sans font-bold text-blue tracking-[0.02em] text-h1  my-8 mb-10 text-balance max-tablet:mb-0">
          News &amp; Events
        </h1>
        {shown.map((item) => {
          const href =
            item.kind === 'news'
              ? `/news/${item.slug}`
              : `/events/${item.slug}`;
          const ctaLabel =
            item.kind === 'news' ? 'CONTINUE READING' : 'VIEW EVENT DETAILS';

          return (
            <article
              key={item.id}
              className="grid grid-cols-[273px_1fr] items-start gap-10 py-10 first-of-type:pt-4 max-tablet:grid-cols-1 max-tablet:gap-5"
            >
              <Link
                href={href}
                aria-label={item.title}
                className="block w-full max-w-[273px] p-0"
              >
                {item.image?.asset?._id ? (
                  <SanityImage
                    className="w-full h-auto !object-contain"
                    image={item.image}
                    alt={item.title}
                    width={600}
                  />
                ) : (
                  <div
                    aria-hidden
                    className="w-full aspect-[273/387] bg-[rgba(0,65,129,0.08)]"
                  />
                )}
              </Link>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1  text-[0.8125rem] uppercase tracking-[0.1em]">
                  {item.date && (
                    <span className="font-light text-black">{item.date}</span>
                  )}
                  {item.label && (
                    <span className="text-black font-semibold text-h3 pb-3">
                      {item.label}
                    </span>
                  )}
                </div>
                <h2 className="font-sans font-bold text-blue text-h2 m-0 text-balance">
                  <Link
                    href={href}
                    className="text-blue no-underline font-inherit p-0 inline transition-colors duration-300 ease-in-out hover:text-accent"
                  >
                    {item.title}
                  </Link>
                </h2>
                {item.subhead && (
                  <p className="italic font-normal text-[1.125rem]  text-blue m-0 text-balance">
                    {item.subhead}
                  </p>
                )}
                {item.excerpt && (
                  <p className="text-black m-0  text-base max-w-[60ch]">
                    {item.excerpt}
                  </p>
                )}
                <div className="mt-2">
                  <Link href={href} className={CTA_CLASS}>
                    {ctaLabel}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
        {hasMore && (
          <div className="text-center mt-12">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="bg-blue border-0 rounded-md text-white px-3 py-2  uppercase tracking-[0.12em] text-[0.8125rem] font-normal cursor-pointer transition-colors duration-200 hover:bg-accent"
            >
              LOAD MORE
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
