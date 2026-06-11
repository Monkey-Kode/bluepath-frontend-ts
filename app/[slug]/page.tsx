import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import Contact from '@/components/Contact';
import Form from '@/components/Form';
import Impact from '@/components/Impact';
import IndividualPageContent from '@/components/IndividualPageContent';
import Projects from '@/components/Projects';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import Team from '@/components/Team';
import { sanityFetch } from '@/sanity/lib/live';
import {
  addressesQuery,
  allPageSlugsQuery,
  casestudiesQuery,
  impactPageContentQuery,
  pageBySlugQuery,
  teamQuery,
} from '@/sanity/lib/queries';

// Slugs owned by hand-built static routes (mirrors gatsby-node STATIC_PAGE_SLUGS).
const STATIC_PAGE_SLUGS = new Set([
  'leadership',
  'news-and-events',
  'thankyou',
]);

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: allPageSlugsQuery,
    perspective: 'published',
    stega: false,
  });
  return (data ?? [])
    .filter((p) => p.slug && !STATIC_PAGE_SLUGS.has(p.slug))
    .map((p) => ({ slug: p.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: page } = await sanityFetch({
    query: pageBySlugQuery,
    params: { slug },
    stega: false,
  });
  if (!page) return {};
  return {
    title: page.seotitle ?? page.name ?? 'Page',
    description: page.description ?? undefined,
  };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: page } = await sanityFetch({
    query: pageBySlugQuery,
    params: { slug },
  });

  if (!page) notFound();

  const contentType = page.contentType?.name;

  let inner: React.ReactNode;
  switch (contentType) {
    case 'Form':
      inner = <Form page={page} />;
      break;
    case 'Connect': {
      const { data: addresses } = await sanityFetch({ query: addressesQuery });
      inner = <Contact page={page} addresses={addresses} />;
      break;
    }
    case 'Impact': {
      const { data: impactContent } = await sanityFetch({
        query: impactPageContentQuery,
      });
      inner = <Impact page={page} content={impactContent} />;
      break;
    }
    case 'Projects': {
      const { data: casestudies } = await sanityFetch({
        query: casestudiesQuery,
      });
      inner = <Projects page={page} casestudies={casestudies} />;
      break;
    }
    case 'Team': {
      const { data: team } = await sanityFetch({ query: teamQuery });
      inner = <Team page={page} team={team} />;
      break;
    }
    default:
      inner = <IndividualPageContent page={page} />;
  }

  return (
    <div className="page">
      <SiteHeader />
      {inner}
      <SiteFooter />
    </div>
  );
}
