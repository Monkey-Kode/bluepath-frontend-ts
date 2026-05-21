'use client';

import { InViewHookResponse } from 'react-intersection-observer';

import { hardcodedSections } from '@/lib/homeSections';

export default function TableOfContents({
  content,
  tableOfContentsRef,
}: {
  content: import('@/sanity.types').HomesectionsQueryResult[number];
  tableOfContentsRef: InViewHookResponse;
}) {
  const { anchorId, sectionContent } = content;

  const paragraphs = (sectionContent ?? '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div ref={tableOfContentsRef.ref}>
      <div
        id={anchorId ?? 'tof'}
        className="flex flex-col items-center justify-center w-full max-w-full py-8 px-6 min-h-[calc(100vh-110px)] overflow-x-hidden min-[1280px]:min-h-[calc(100vh-var(--header-height))] min-[1280px]:px-16"
      >
        {/* Hidden SVG defs for the hex/diamond tile clip path */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <clipPath id="tofClipPath" clipPathUnits="objectBoundingBox">
              <path d="M0.992,0.876 V0.124 L0.876,0.008 H0.124 L0.008,0.124 V0.876 L0.124,0.992 H0.876 L0.992,0.876 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Heading is rendered by HomeHero as the pinned title overlay. */}

        {/*<hr className="w-full max-w-[750px] border-0 border-t border-accent m-0" />*/}

        {/*<ul className="list-none flex justify-center items-center gap-10 py-8 m-0 w-full max-w-[1100px] flex-wrap max-tablet:gap-1 max-tablet:py-5">
          {hardcodedSections.map((section) => (
            <li key={section.anchorId} className="relative m-0 p-0 group">
              <figure
                role="img"
                aria-label={section.image.alt}
                style={{ backgroundImage: `url(${section.image.imageUrl})` }}
                className="relative w-[140px] h-[140px] m-0 bg-cover bg-[left_center] bg-no-repeat [clip-path:url('#tofClipPath')] group-hover:[animation:tofPan_5s_linear_infinite] after:content-[''] after:absolute after:inset-0 after:bg-black/25 after:transition-colors after:duration-300 group-hover:after:bg-black/15 max-tablet:w-[80px] max-tablet:h-[80px]"
              />
              <a
                href={`#${section.anchorId}`}
                className="absolute inset-0 flex items-center justify-center no-underline p-0"
              >
                <span className="text-white uppercase font-sans font-semibold tracking-normal text-center leading-[1.1] text-[clamp(0.75rem,_0.6rem_+_0.6vw,_0.85rem)] px-1 opacity-100 transition-opacity duration-300">
                  {section.heading}
                </span>
              </a>
            </li>
          ))}
        </ul>*/}

        {/*<hr className="w-full max-w-[750px] border-0 border-t border-accent m-0" />*/}

        {paragraphs.length > 0 && (
          <div
            data-tof-body
            className="prose max-w-[680px] text-center py-8 font-sans text-black text-pretty"
          >
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`m-0 text-black ${i === paragraphs.length - 1 ? 'mb-0' : 'mb-4'}`}
              >
                {p}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-center pt-4 pb-8">
          <svg
            viewBox="0 0 20 24"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            className="w-[23px] h-[27px] fill-white stroke-accent [stroke-width:1] [vector-effect:non-scaling-stroke] rotate-90"
          >
            <polygon points="2,2 18,12 2,22" />
          </svg>
        </div>
      </div>
    </div>
  );
}
