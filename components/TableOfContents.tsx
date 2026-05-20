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
  const { anchorId, sectionContent, sectionHeading } = content;

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

        {sectionHeading && (
          <h2 className="font-serif font-extrabold text-[#1d4483] text-center leading-[1.05] m-0 mb-8 text-balance max-w-[1100px] text-[var(--text-h1)] min-[1440px]:text-[var(--text-display)]">
            {sectionHeading}
          </h2>
        )}

        <hr className="w-full max-w-[750px] border-0 border-t border-accent m-0" />

        <ul className="list-none flex justify-center items-center gap-10 py-8 m-0 w-full max-w-[1100px] flex-wrap max-tablet:gap-1 max-tablet:py-5">
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
        </ul>

        <hr className="w-full max-w-[750px] border-0 border-t border-accent m-0" />

        {paragraphs.length > 0 && (
          <div className="max-w-[680px] text-center py-8 font-sans text-black leading-[1.6] text-[var(--text-h4)] text-pretty min-[1440px]:text-[var(--text-h3)] [&_p]:m-0 [&_p]:mb-4 [&_p]:text-black [&_p:last-child]:mb-0">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        <div className="flex justify-center pt-4 pb-8 [&_svg]:w-[23px] [&_svg]:h-[27px] [&_svg]:fill-white [&_svg]:stroke-accent [&_svg]:[stroke-width:1] [&_svg]:[vector-effect:non-scaling-stroke] [&_svg]:rotate-90">
          <svg
            viewBox="0 0 20 24"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <polygon points="2,2 18,12 2,22" />
          </svg>
        </div>
      </div>
    </div>
  );
}
