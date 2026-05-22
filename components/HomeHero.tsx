'use client';

import { useEffect, useRef, useState } from 'react';
import type { InViewHookResponse } from 'react-intersection-observer';

import TableOfContents from '@/components/TableOfContents';
import Video from '@/components/Video';
import type {
  HomesectionsQueryResult,
  HomevideoQueryResult,
} from '@/sanity.types';

// Shared by the overlay title and the in-flow title so the pin → flow
// handoff is pixel-identical. Width context must match too (both centered in
// the full viewport width, same max-width + padding).
const TITLE_CLASS =
  'max-w-[1100px] px-6 text-balance text-center font-sans font-bold text-h1';

/**
 * Home hero scroll scene (mobile-robust).
 *
 * - The video stays pinned (sticky, z-0) behind everything.
 * - The white Table-of-Contents panel (z-10) holds the *real* title in normal
 *   flow, centred above the paragraph below the header — so layout is
 *   device-independent and never collides with the fixed header.
 * - A fixed overlay title (z-20) sits centred over the video. It is drawn
 *   twice — a white copy plus a blue copy clipped to the white panel's top
 *   edge — so the colour boundary follows the rising seam exactly (the title
 *   can straddle the video/white edge across any number of lines).
 * - When the in-flow title rises to meet the overlay, we swap visibility:
 *   overlay hides, in-flow title shows and scrolls away normally. Seamless,
 *   because both copies are identical at the swap frame.
 */
export default function HomeHero({
  videoSection,
  tofSection,
  videos,
  tableOfContentsRef,
}: {
  videoSection: HomesectionsQueryResult[number];
  tofSection: HomesectionsQueryResult[number];
  videos: HomevideoQueryResult;
  tableOfContentsRef: InViewHookResponse;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const overlayTitleRef = useRef<HTMLHeadingElement>(null);

  const [clipTop, setClipTop] = useState(99999);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const white = whiteRef.current;
      const overlayTitle = overlayTitleRef.current;
      if (!white || !overlayTitle) return;

      const vh = window.innerHeight;
      const titleH = overlayTitle.offsetHeight;
      // Matches where flex centering renders the overlay (vertically centred
      // in the viewport) so the clip/handoff math lines up with it.
      const top = Math.max((vh - titleH) / 2, 0);

      // Blue copy reveals where the white panel sits behind the title
      // (everything below the panel's top edge).
      const whiteTop = white.getBoundingClientRect().top;
      setClipTop(Math.max(whiteTop - top, 0));

      // Handoff: once the in-flow title has risen to the pinned position,
      // hide the overlay and show the real (flow) title.
      const flow = white.querySelector<HTMLElement>('[data-tof-title]');
      if (flow) {
        const handoff = flow.getBoundingClientRect().top <= top;
        setShowOverlay(!handoff);
        flow.style.visibility = handoff ? 'visible' : 'hidden';
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const heading = tofSection.sectionHeading;

  return (
    <div ref={sceneRef} className="relative">
      {/* z-0 — pinned video background */}
      <div className="sticky top-0 z-0 h-screen w-full overflow-hidden">
        <Video content={videoSection} videos={videos} />
      </div>

      {/* z-20 — fixed overlay title (white base + seam-clipped blue copy) */}
      {heading && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
          style={{ visibility: showOverlay ? 'visible' : 'hidden' }}
        >
          <div className="relative">
            <h1 ref={overlayTitleRef} className={`${TITLE_CLASS} text-white`}>
              {heading}
            </h1>
            <h1
              className={`${TITLE_CLASS} absolute inset-0 text-blue`}
              style={{ clipPath: `inset(${clipTop}px 0 0 0)` }}
            >
              {heading}
            </h1>
          </div>
        </div>
      )}

      {/* z-10 — white panel holding the real title + paragraph */}
      <div ref={whiteRef} className="relative z-10 bg-white">
        <TableOfContents
          content={tofSection}
          tableOfContentsRef={tableOfContentsRef}
          titleClassName={`${TITLE_CLASS} text-blue`}
        />
      </div>
    </div>
  );
}
