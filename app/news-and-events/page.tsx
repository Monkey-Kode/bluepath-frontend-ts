import type { Metadata } from 'next';

import NewsEventsArchive from '@/components/NewsEventsArchive';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { sanityFetch } from '@/sanity/lib/live';
import { allEventsQuery, allNewsQuery } from '@/sanity/lib/queries';

export const metadata: Metadata = {
  title: 'News & Events',
  description: 'The latest news, press, and events from BluePath Finance.',
};

export default async function NewsAndEventsPage() {
  const [{ data: news }, { data: events }] = await Promise.all([
    sanityFetch({ query: allNewsQuery }),
    sanityFetch({ query: allEventsQuery }),
  ]);

  return (
    <div>
      <SiteHeader />
      <NewsEventsArchive news={news} events={events} />
      <SiteFooter />
    </div>
  );
}
