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
    <main className="bg-white text-black pt-[calc(var(--header-height,100px)+4rem)] pb-20 px-5">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[360px_1fr] items-start gap-14 max-[900px]:grid-cols-1 max-[900px]:gap-8">
        <div className="[&_img]:w-full [&_img]:h-auto">
          {content.image?.asset?._id && (
            <SanityImage
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
            <h1 className="font-serif font-bold text-blue text-h1 leading-[1.2] m-0 mb-6 text-balance">
              {content.name}
            </h1>
          )}
          {richText && (
            <div className="prose prose-lg prose-slate max-w-none mb-8 prose-headings:font-serif prose-p:font-serif prose-li:font-serif prose-blockquote:font-serif prose-headings:text-black prose-blockquote:border-accent">
              <NewsBody value={richText} />
            </div>
          )}
          <div className="mt-6 max-w-none tablet:max-w-[500px] [&_label]:hidden [&_input]:bg-white [&_input]:border [&_input]:border-[var(--color-gray-3)] [&_input]:rounded-none [&_input]:mb-[0.6rem] [&_input]:px-3 [&_input]:py-[0.65rem] [&_input]:font-sans [&_input]:text-[var(--color-gray-3)] [&_input]:text-sm [&_textarea]:bg-white [&_textarea]:border [&_textarea]:border-[var(--color-gray-3)] [&_textarea]:rounded-none [&_textarea]:mb-[0.6rem] [&_textarea]:px-3 [&_textarea]:py-[0.65rem] [&_textarea]:font-sans [&_textarea]:text-[var(--color-gray-3)] [&_textarea]:text-sm [&_select]:bg-white [&_select]:border [&_select]:border-[var(--color-gray-3)] [&_select]:rounded-none [&_select]:mb-[0.6rem] [&_select]:px-3 [&_select]:py-[0.65rem] [&_select]:font-sans [&_select]:text-[var(--color-gray-3)] [&_select]:text-sm [&_input::placeholder]:text-[var(--color-gray-3)] [&_input::placeholder]:uppercase [&_input::placeholder]:tracking-[0.06em] [&_input::placeholder]:text-[1.25rem] [&_textarea::placeholder]:text-[var(--color-gray-3)] [&_textarea::placeholder]:uppercase [&_textarea::placeholder]:tracking-[0.06em] [&_textarea::placeholder]:text-[1.25rem] [&_button[type=submit]]:bg-white [&_button[type=submit]]:text-[var(--color-gray-3)] [&_button[type=submit]]:border [&_button[type=submit]]:border-[var(--color-gray-3)] [&_button[type=submit]]:rounded-none [&_button[type=submit]]:uppercase [&_button[type=submit]]:tracking-[0.5px] [&_button[type=submit]]:text-[1.25rem] [&_button[type=submit]]:font-medium [&_button[type=submit]]:py-2 [&_button[type=submit]]:px-2 [&_button[type=submit]]:cursor-pointer [&_button[type=submit]]:transition-colors [&_button[type=submit]:hover]:bg-accent [&_button[type=submit]:hover]:text-white [&_button[type=submit]:hover]:border-accent [&_.submit-row]:flex [&_.submit-row]:items-center [&_.submit-row]:justify-center [&_.submit-row]:gap-[0.6rem] [&_.submit-row]:mt-4 [&_.submit-triangle]:w-[23px] [&_.submit-triangle]:h-[27px] [&_.submit-triangle]:fill-white [&_.submit-triangle]:stroke-accent [&_.submit-triangle]:[stroke-width:1] [&_.submit-triangle]:[vector-effect:non-scaling-stroke] [&_.submit-triangle]:block [&_.submit-triangle]:origin-center [&_.submit-triangle]:transition-all [&_.submit-row:hover_.submit-triangle]:fill-accent [&_.submit-row:hover_.submit-triangle]:translate-x-1 [&_.submit-row:hover_.submit-triangle]:scale-[1.12]">
            <FormBasic name={content.name} />
          </div>
        </div>
      </div>
    </main>
  );
}
