'use client';

import FormBasic from '@/components/FormBasic';
import NewsBody from '@/components/NewsBody';
import SanityImage from '@/components/SanityImage';
import ViewTransition from '@/components/ViewTransition';
import { mediaTransitionName, titleTransitionName } from '@/lib/newsEvents';
import type { EventBySlugQueryResult } from '@/sanity.types';

export default function EventView({
  content,
  slug,
}: {
  content: NonNullable<EventBySlugQueryResult>;
  slug: string;
}) {
  const richText = content.content ?? null;
  const hasImage = !!content.image?.asset?._id;
  const mediaVt = mediaTransitionName('event', slug);
  const titleVt = titleTransitionName('event', slug);
  const eventDate = content.eventAt
    ? (() => {
        const [year, month, day] = content.eventAt.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      })()
    : null;

  return (
    <main className="bg-white text-black pt-[calc(var(--header-height,100px)+4rem)] pb-20">
      <div
        className={`mx-auto grid max-w-7xl px-5 items-start gap-14 max-[900px]:gap-8 ${
          hasImage
            ? 'grid-cols-[360px_1fr] max-[900px]:grid-cols-1'
            : 'grid-cols-1'
        }`}
      >
        {hasImage && (
          <div>
            <ViewTransition name={mediaVt} share="morph-media">
              {/* SanityImage briefly renders a preview <img> alongside the
               * main <img>; React's <ViewTransition> applies
               * view-transition-name to every direct child and auto-suffixes
               * duplicates, which breaks the pairing with the archive's
               * single named img. The wrapping figure collapses that to one
               * direct child so only the figure gets the name. */}
              <figure className="m-0">
                <SanityImage
                  className="w-full h-auto"
                  image={content.image}
                  alt={content.name ?? 'Event'}
                  width={720}
                />
              </figure>
            </ViewTransition>
          </div>
        )}
        <div>
          <div className="mb-4 flex flex-col gap-1 font-sans">
            {eventDate && (
              <span className="text-blue italic text-[0.9375rem] font-normal">
                {eventDate}
              </span>
            )}
            {content.publication && (
              <span className="text-blue italic font-bold text-[1.25rem] uppercase tracking-[0.05em]">
                {content.publication}
              </span>
            )}
          </div>
          {content.name && (
            <ViewTransition name={titleVt} share="morph">
              <h1 className="font-sans font-bold text-blue text-h1 m-0 mb-6 text-balance">
                {content.name}
              </h1>
            </ViewTransition>
          )}
          {richText && (
            <div className="prose  max-w-none mb-8 prose-headings:font-sans prose-p:font-sans prose-li:font-sans prose-blockquote:font-sans prose-headings:text-black prose-blockquote:border-accent">
              <NewsBody value={richText} />
            </div>
          )}
          <div className="mt-6 max-w-none tablet:max-w-[550px]">
            <FormBasic name={content.name} />
          </div>
        </div>
      </div>
    </main>
  );
}
