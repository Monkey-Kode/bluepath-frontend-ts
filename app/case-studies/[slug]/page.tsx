import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ArticleView from '@/components/ArticleView';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { articleMetadata } from '@/lib/articles';
import { caseStudyLabel, caseStudyTitle } from '@/lib/caseStudies';
import { sanityFetch } from '@/sanity/lib/live';
import {
  allCaseStudySlugsQuery,
  caseStudyBySlugQuery,
} from '@/sanity/lib/queries';

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: allCaseStudySlugsQuery,
    perspective: 'published',
    stega: false,
  });
  return (data ?? []).flatMap((c) => (c.slug ? [{ slug: c.slug }] : []));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: caseStudy } = await sanityFetch({
    query: caseStudyBySlugQuery,
    params: { slug },
    stega: false,
  });
  if (!caseStudy) return {};
  return articleMetadata({ ...caseStudy, title: caseStudyTitle(caseStudy) });
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: caseStudy } = await sanityFetch({
    query: caseStudyBySlugQuery,
    params: { slug },
  });

  if (!caseStudy) notFound();

  return (
    <div>
      <SiteHeader />
      <ArticleView
        kind="caseStudy"
        slug={slug}
        article={{
          ...caseStudy,
          title: caseStudyTitle(caseStudy),
          label: caseStudyLabel(caseStudy.project),
        }}
      />
      <SiteFooter />
    </div>
  );
}
