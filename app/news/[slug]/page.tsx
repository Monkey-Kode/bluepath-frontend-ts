import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ArticleView from '@/components/ArticleView';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { articleMetadata } from '@/lib/articles';
import { sanityFetch } from '@/sanity/lib/live';
import { allNewsSlugsQuery, newsBySlugQuery } from '@/sanity/lib/queries';

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: allNewsSlugsQuery,
    perspective: 'published',
    stega: false,
  });
  return (data ?? [])
    .filter((n) => n.slug)
    .map((n) => ({ slug: n.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: article } = await sanityFetch({
    query: newsBySlugQuery,
    params: { slug },
    stega: false,
  });
  if (!article) return {};
  return articleMetadata({ ...article, title: article.title ?? 'News' });
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: article } = await sanityFetch({
    query: newsBySlugQuery,
    params: { slug },
  });

  if (!article) notFound();

  return (
    <div className="news">
      <SiteHeader />
      <ArticleView kind="news" article={article} slug={slug} />
      <SiteFooter />
    </div>
  );
}
