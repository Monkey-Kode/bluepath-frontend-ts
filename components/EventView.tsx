'use client';

import FormBasic from '@/components/FormBasic';
import NewsBody from '@/components/NewsBody';
import SanityImage from '@/components/SanityImage';
import type { EventBySlugQueryResult } from '@/sanity.types';

export default function EventView({
  content,
}: {
  content: NonNullable<EventBySlugQueryResult>;
}) {
  const richText = content.content ?? null;
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
      <div className="mx-auto grid max-w-7xl px-5 grid-cols-[360px_1fr] items-start gap-14 max-[900px]:grid-cols-1 max-[900px]:gap-8">
        <div>
          {content.image?.asset?._id && (
            <SanityImage
              className="w-full h-auto"
              image={content.image}
              alt={content.name ?? 'Event'}
              width={720}
            />
          )}
        </div>
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
            <h1 className="font-serif font-bold text-blue text-h1 m-0 mb-6 text-balance">
              {content.name}
            </h1>
          )}
          {richText && (
            <div className="prose  max-w-none mb-8 prose-headings:font-serif prose-p:font-serif prose-li:font-serif prose-blockquote:font-serif prose-headings:text-black prose-blockquote:border-accent">
              <NewsBody value={richText} />
            </div>
          )}
          <div className="mt-6 max-w-none tablet:max-w-[500px]">
            <FormBasic name={content.name} />
          </div>
        </div>
      </div>
    </main>
  );
}
