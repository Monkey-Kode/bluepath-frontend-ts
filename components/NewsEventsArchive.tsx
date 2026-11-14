import ArticleArchive, { type ArchiveItem } from '@/components/ArticleArchive';
import { archiveImage } from '@/lib/articles';
import type { AllEventsQueryResult, AllNewsQueryResult } from '@/sanity.types';

const eventDateToISO = (eventAt: string) => `${eventAt}T00:00:00`;

/** The News & Events archive: news and events in one list. */
export default function NewsEventsArchive({
  news,
  events,
}: {
  news: AllNewsQueryResult;
  events: AllEventsQueryResult;
}) {
  const newsItems: ArchiveItem[] = news.flatMap((n) =>
    n.slug && n.publishedAt
      ? [
          {
            kind: 'news',
            id: n._id,
            slug: n.slug,
            title: n.title ?? 'Untitled',
            subhead: n.subhead ?? null,
            label: n.publication ?? null,
            excerpt: n.excerpt ?? null,
            date: n.publishedAt,
            image: archiveImage(n.featuredImage, n.heroImage),
          },
        ]
      : [],
  );

  const eventItems: ArchiveItem[] = events.flatMap((e) =>
    e.slug && e.eventAt
      ? [
          {
            kind: 'event',
            id: e._id,
            slug: e.slug,
            title: e.name ?? 'Untitled event',
            subhead: null,
            label: e.publication ?? null,
            excerpt: e.description ?? null,
            date: eventDateToISO(e.eventAt),
            image: e.image ?? null,
          },
        ]
      : [],
  );

  return (
    <ArticleArchive
      heading="News & Events"
      items={[...newsItems, ...eventItems]}
    />
  );
}
