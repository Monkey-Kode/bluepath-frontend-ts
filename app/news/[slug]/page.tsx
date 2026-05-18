import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import NewsArticleView from '@/components/NewsArticleView';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
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
  const description = article.seoDescription ?? article.excerpt ?? undefined;
  const ogImage = article.heroImage?.asset?.url ?? undefined;
  return {
    title: article.title ?? 'News',
    description: description ?? undefined,
    openGraph: {
      type: 'article',
      images: ogImage ? [ogImage] : [],
      ...(article.publishedAt
        ? { publishedTime: new Date(article.publishedAt).toISOString() }
        : {}),
    },
  };
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
      <NewsArticleView article={article} />
      <SiteFooter />
    </div>
  );
}
