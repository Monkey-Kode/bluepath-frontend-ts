import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import EventView from '@/components/EventView';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { sanityFetch } from '@/sanity/lib/live';
import { allEventSlugsQuery, eventBySlugQuery } from '@/sanity/lib/queries';

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: allEventSlugsQuery,
    perspective: 'published',
    stega: false,
  });
  return (data ?? [])
    .filter((e) => e.slug)
    .map((e) => ({ slug: e.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: content } = await sanityFetch({
    query: eventBySlugQuery,
    params: { slug },
    stega: false,
  });
  if (!content) return {};
  return {
    title: content.name ?? 'Event',
    description: content.description ?? undefined,
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: content } = await sanityFetch({
    query: eventBySlugQuery,
    params: { slug },
  });

  if (!content) notFound();

  return (
    <div className="event">
      <SiteHeader />
      <EventView content={content} />
      <SiteFooter />
    </div>
  );
}
