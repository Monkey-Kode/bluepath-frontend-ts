'use client';

import { InViewHookResponse } from 'react-intersection-observer';

export default function TableOfContents({
  content,
  tableOfContentsRef,
  titleClassName,
}: {
  content: import('@/sanity.types').HomesectionsQueryResult[number];
  tableOfContentsRef: InViewHookResponse;
  /** Class for the in-flow title — must match HomeHero's overlay title so
   *  the pin → flow handoff is pixel-seamless. */
  titleClassName?: string;
}) {
  const { anchorId, sectionContent, sectionHeading } = content;

  const paragraphs = (sectionContent ?? '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div ref={tableOfContentsRef.ref}>
      <div
        id={anchorId ?? 'tof'}
        className="flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-x-clip pb-12 pt-[calc(var(--header-height,100px)+1rem)]"
      >
        {/*
          In-flow title (the "settled" copy). Starts hidden — HomeHero shows
          the fixed overlay over the video and reveals this one (and hides the
          overlay) at the handoff, when this title rises to the pinned spot.
        */}
        {sectionHeading && (
          <h1
            data-tof-title
            style={{ visibility: 'hidden' }}
            className={
              titleClassName ??
              'max-w-[1100px] px-6 text-balance text-center font-sans font-bold text-h1 text-blue'
            }
          >
            {sectionHeading}
          </h1>
        )}

        {paragraphs.length > 0 && (
          <div
            data-tof-body
            className="prose mt-[var(--space-m,1.5rem)] max-w-[680px] px-6 py-8 text-center font-sans text-black text-pretty"
          >
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`m-0 text-black ${
                  i === paragraphs.length - 1 ? 'mb-0' : 'mb-4'
                }`}
              >
                {p}
              </p>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
