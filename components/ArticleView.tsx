'use client';

import type { ComponentProps } from 'react';

import NewsBody from '@/components/NewsBody';
import SanityImage from '@/components/SanityImage';
import ViewTransition from '@/components/ViewTransition';
import {
  type ArticleKind,
  formatArticleDate,
  mediaTransitionName,
  titleTransitionName,
} from '@/lib/articles';

type HeroImage =
  | (NonNullable<ComponentProps<typeof SanityImage>['image']> & {
      caption?: string | null;
    })
  | null;

export type ArticleViewData = {
  title?: string | null;
  /** News leaves it out. A case study shows its project's category and place. */
  label?: string | null;
  heroImage?: HeroImage;
  publishedAt?: string | null;
  body?: unknown;
};

/** The article layout that news and case studies share. */
export default function ArticleView({
  kind,
  article,
  slug,
}: {
  kind: ArticleKind;
  article: ArticleViewData;
  slug: string;
}) {
  const mediaVt = mediaTransitionName(kind, slug);
  const titleVt = titleTransitionName(kind, slug);
  const publishedAt = formatArticleDate(article.publishedAt);

  return (
    <main className="header-offset bg-white text-black px-5 pb-20">
      <article className="mx-auto max-w-2xl">
        {article.title && (
          <ViewTransition name={titleVt} share="morph">
            <h1 className="font-sans font-bold text-blue text-h1 mx-0 mt-8 mb-6 text-balance">
              {article.title}
            </h1>
          </ViewTransition>
        )}
        {article.label && (
          <p className="mt-0 mb-6 font-sans text-[0.8125rem] font-light uppercase tracking-[0.1em] text-black">
            {article.label}
          </p>
        )}
        {article.heroImage?.asset?._id && (
          <ViewTransition name={mediaVt} share="morph-media">
            <figure className="m-0 mb-4">
              <SanityImage
                className="block h-auto w-full"
                image={article.heroImage}
                alt={article.title ?? 'Article hero image'}
                width={1440}
              />
              {article.heroImage.caption && (
                <figcaption className="mt-2 font-sans text-sm text-[var(--color-gray-2)]">
                  {article.heroImage.caption}
                </figcaption>
              )}
            </figure>
          </ViewTransition>
        )}
        {publishedAt && (
          <time className="block font-sans text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-black mt-6 mb-8">
            {publishedAt}
          </time>
        )}
        {article.body ? (
          <div className="prose prose-lg prose-default max-w-none prose-p:leading-relaxed prose-p:my-7 prose-headings:font-sans prose-headings:text-black prose-h2:mt-14 prose-h2:mb-4 prose-h3:mt-10 prose-h3:mb-3 prose-a:text-black prose-a:font-medium hover:prose-a:text-accent prose-blockquote:border-accent prose-blockquote:text-black prose-strong:font-semibold">
            <NewsBody value={article.body} />
          </div>
        ) : null}
      </article>
    </main>
  );
}
