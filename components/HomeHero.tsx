'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { InViewHookResponse } from 'react-intersection-observer';

import TableOfContents from '@/components/TableOfContents';
import Video from '@/components/Video';
import type {
  HomesectionsQueryResult,
  HomevideoQueryResult,
} from '@/sanity.types';

/**
 * Home hero scroll scene.
 *
 * A muted/looping/controlless video stays pinned (sticky, z-0) behind the
 * title. The title (z-20) is JS-pinned at viewport centre over the
 * black-scrimmed video — white at first, flipping to blue once the white
 * Table-of-Contents panel (z-10) rises behind it. The title holds that
 * centred position until the TOF body content rises up to meet it, then
 * releases into normal flow just above the body and scrolls away.
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const [titleStyle, setTitleStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: '50%',
    transform: 'translateY(-50%)',
    left: 0,
    right: 0,
  });
  const [onWhite, setOnWhite] = useState(false);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const scene = sceneRef.current;
      const title = titleRef.current;
      const white = whiteRef.current;
      if (!scene || !title || !white) return;

      const vh = window.innerHeight;
      const titleH = title.offsetHeight;
      const pinnedTop = Math.max((vh - titleH) / 2, 0);
      const pinnedBottom = pinnedTop + titleH;

      // Top of the actual TOF copy (body paragraph) inside the white panel.
      const body = white.querySelector<HTMLElement>('[data-tof-body]');
      const bodyTop = (body ?? white).getBoundingClientRect().top;

      if (bodyTop > pinnedBottom) {
        // PIN — hold the title at viewport centre over the video.
        setTitleStyle({
          position: 'fixed',
          top: `${pinnedTop}px`,
          left: 0,
          right: 0,
        });
      } else {
        // RELEASE — settle into the scene just above the body, then scroll.
        const sceneTop = scene.getBoundingClientRect().top + window.scrollY;
        const bodyDocTop = bodyTop + window.scrollY;
        setTitleStyle({
          position: 'absolute',
          top: `${Math.max(bodyDocTop - sceneTop - titleH, 0)}px`,
          left: 0,
          right: 0,
        });
      }

      // White panel risen behind the title's midline → flip to blue.
      setOnWhite(white.getBoundingClientRect().top <= pinnedTop + titleH / 2);
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

      {/* z-20 — JS-pinned title (fixed → absolute on release) */}
      {heading && (
        <h1
          ref={titleRef}
          style={titleStyle}
          className={`pointer-events-none z-20 mx-auto max-w-[1100px] px-6 text-balance text-center font-serif font-extrabold text-h1 transition-colors duration-300 ease-out min-[1440px]:text-display ${
            onWhite ? 'text-blue' : 'text-white'
          }`}
        >
          {heading}
        </h1>
      )}

      {/* z-10 — white TOF content rising over the video */}
      <div ref={whiteRef} className="relative z-10 bg-white">
        <TableOfContents
          content={tofSection}
          tableOfContentsRef={tableOfContentsRef}
        />
      </div>
    </div>
  );
}
