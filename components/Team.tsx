'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  SyntheticEvent,
} from 'react';

import { twMerge } from 'tailwind-merge';

import sortObject from '@/utils/sortObject';
import TeamCard from '@/components/TeamCard';
import TeamThumbnail from '@/components/TeamThumbnail';
import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import type { PageBySlugQueryResult, TeamQueryResult } from '@/sanity.types';

const TEAM_SECTION_CLASS =
  '!bg-fixed bg-[center_bottom] bg-no-repeat [background-size:100%_100%] bg-[linear-gradient(173deg,rgba(24,85,140,1)_0%,rgba(116,162,195,1)_32%,rgba(172,208,232,1)_50%,rgba(116,162,195,1)_70%,rgba(1,65,127,1)_100%)] before:!bg-fixed';

/**
 * Full-bleed home-box layout — the former global `section:not([aria-label])`
 * rule, passed in only when this Team section is a home box (`fullHeight`).
 * On its own page (`/leadership`) it's normal-flow and clears the fixed header.
 */
const BOX_SECTION =
  'flex w-screen items-center justify-start p-[2vw] [&>div]:w-full max-tablet:block max-tablet:p-0';

function Team({
  page,
  team,
  fullHeight = false,
}: {
  page: NonNullable<PageBySlugQueryResult>;
  team: TeamQueryResult;
  fullHeight?: boolean;
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [currentSlide, setcurrentSlide] = useState('');
  const thumbsRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const container = thumbsRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth,
      );
    }
  }, []);

  const { name, background, backgroundColor, mobilebackground } = page;
  let sectionBg = background;
  if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(max-width: 600px)');
    if (!mql.matches && background) sectionBg = background;
    else if (mql.matches && mobilebackground) sectionBg = mobilebackground;
    else sectionBg = background;
  }

  const bgColor = backgroundColor?.hex ?? 'transparent';
  const members = sortObject(team);

  useEffect(() => {
    const container = thumbsRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll]);

  useEffect(() => {
    const slider = document.getElementById('team-carousel');
    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    if (slider) {
      slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
      });
      slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active');
      });
      slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');
      });
      slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = x - startX;
        slider.scrollLeft = scrollLeft - walk;
      });
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = thumbsRef.current;
    if (container) {
      const cardWidth = 200;
      const gap = 20;
      const scrollAmount = cardWidth + gap;
      const newScrollPosition =
        direction === 'left'
          ? container.scrollLeft - scrollAmount
          : container.scrollLeft + scrollAmount;
      container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
    }
  };

  return (
    <SanityBackgroundImage
      as="section"
      id={name ?? undefined}
      image={sectionBg ?? null}
      style={{ backgroundColor: bgColor ?? undefined }}
      className={twMerge(
        TEAM_SECTION_CLASS,
        fullHeight ? BOX_SECTION : 'header-offset',
      )}
      fullHeight={fullHeight}
      onClick={(_e: SyntheticEvent) => setcurrentSlide('')}
    >
      <div
        id="teamWrapper"
        className="team-wrapper w-full tablet:mt-[107px] max-tablet:px-[5%] max-tablet:py-[10%]"
      >
        <h2 className="text-white text-[3rem] max-tablet:text-[2rem]">
          {name}
        </h2>

        <div className="relative w-full mb-12 max-tablet:mb-0">
          {members.map(({ id, image, name, role, bio }) => {
            if (currentSlide !== id) return null;
            return (
              <TeamCard
                key={id}
                id={id}
                name={name}
                image={image}
                role={role}
                bio={bio}
              />
            );
          })}
        </div>

        <div className="relative w-full px-[30px] max-[1023px]:px-0">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            data-visible={canScrollLeft}
            className="absolute top-1/2 -left-5 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-none bg-transparent cursor-pointer transition-opacity duration-300 data-[visible=true]:opacity-100 data-[visible=true]:pointer-events-auto data-[visible=false]:opacity-50 data-[visible=false]:pointer-events-none max-[1023px]:hidden"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            data-visible={canScrollRight}
            className="absolute top-1/2 -right-5 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-none bg-transparent cursor-pointer transition-opacity duration-300 data-[visible=true]:opacity-100 data-[visible=true]:pointer-events-auto data-[visible=false]:opacity-50 data-[visible=false]:pointer-events-none max-[1023px]:hidden"
          >
            →
          </button>
          <div
            id="team-carousel"
            ref={thumbsRef}
            className="grid grid-cols-2 gap-4 items-start overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 min-[769px]:grid-cols-3 min-[1024px]:grid-flow-col min-[1024px]:grid-cols-[auto] min-[1024px]:gap-5 min-[1024px]:items-center min-[1024px]:mx-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-blue [&::-webkit-scrollbar-thumb]:rounded hover:[&::-webkit-scrollbar-thumb]:bg-[#555] [&>div]:h-full max-[1023px]:[&>div]:p-0 max-[1023px]:[&>div]:mx-auto min-[1024px]:[&>div]:max-w-[200px] min-[1024px]:[&>div]:mx-auto min-[1024px]:[&>div]:snap-start"
          >
            {members.map(({ id, image, name, role }) => (
              <TeamThumbnail
                key={id}
                id={id}
                name={name}
                image={image}
                role={role}
                setcurrentSlide={setcurrentSlide}
              />
            ))}
          </div>
        </div>
      </div>
    </SanityBackgroundImage>
  );
}

export default Team;
