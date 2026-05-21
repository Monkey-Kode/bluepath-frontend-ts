'use client';

import NewsBody from '@/components/NewsBody';
import SanityImage from '@/components/SanityImage';
import type { NewsBySlugQueryResult } from '@/sanity.types';

export default function NewsArticleView({
    article,
}: {
    article: NonNullable<NewsBySlugQueryResult>;
}) {
    const publishedAt = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : null;

    return (
        <main className="header-offset bg-white text-black px-5 pb-20">
            <article className="mx-auto max-w-4xl">
                {article.title && (
                    <h1 className="font-sans font-bold text-blue text-h1 m-0 mb-6 text-balance">
                        {article.title}
                    </h1>
                )}
                {article.heroImage?.asset?._id && (
                    <figure className="m-0 mb-4 [&_img]:block [&_img]:h-auto [&_img]:w-full">
                        <SanityImage
                            image={article.heroImage}
                            alt={article.title ?? 'Article hero image'}
                            width={1440}
                        />
                    </figure>
                )}
                {publishedAt && (
                    <time className="block font-sans text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-black mt-6 mb-8">
                        {publishedAt}
                    </time>
                )}
                {article.body ? (
                    <div className="prose prose-default max-w-none prose-headings:font-sans prose-headings:text-black prose-a:text-black prose-a:font-medium hover:prose-a:text-accent prose-blockquote:border-accent prose-blockquote:text-black prose-strong:font-semibold">
                        <NewsBody value={article.body} />
                    </div>
                ) : null}
            </article>
        </main>
    );
}
