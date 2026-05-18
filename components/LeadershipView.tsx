'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

import SanityImage from '@/components/SanityImage';
import sortObject from '@/utils/sortObject';
import { headerOffset } from '@/styles/mixins';
import type { TeamQueryResult } from '@/sanity.types';

type Member = TeamQueryResult[number];

const StyledLeadership = styled.main`
  background: #fff;
  color: var(--blue);
  ${headerOffset}
  padding-bottom: 5rem;
  padding-inline: 1.25rem;
  position: relative;

  .leadership-wrap {
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
  }

  h1 {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    letter-spacing: 0.02em;
    font-size: var(--text-h2);
    line-height: 1.1;
    margin: 2rem 0 2.5rem;
  }
`;

const BioPanelWrap = styled.div`
  margin-inline: 2.5rem;
`;

const BioCard = styled.article`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 2rem;
  padding: 1rem 0 2.5rem;
  align-items: start;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .bio-image {
    width: 100%;
    aspect-ratio: 4 / 5;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .bio-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0 0 1rem;
  }

  .bio-name {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h2);
    line-height: 1.1;
    margin: 0;
  }

  .bio-role,
  .bio-role-subtitle {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    color: var(--blue);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--text-h3);
    font-weight: 400;
    margin: 0;
  }

  .bio-content {
    columns: 2;
    column-gap: 2rem;

    @media (max-width: 800px) {
      columns: 1;
    }
  }

  .bio-content p {
    color: #000;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    line-height: 1.6;
    margin: 0 0 0.75rem;
    break-inside: avoid;
  }

  .bio-close {
    background: transparent;
    border: 0;
    color: var(--blue);
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.5rem 0 0;
    &:hover {
      color: var(--accent);
    }
  }
`;

const CarouselWrap = styled.div`
  position: relative;
  margin-inline: 2.5rem;
`;

const CarouselTrack = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 225px;
  gap: 3.5rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding-block-end: 0.75rem;

  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }

  > * {
    scroll-snap-align: start;
  }
`;

const Card = styled.button<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  background: transparent;
  border: 0;
  padding: 0 0 1rem;
  text-align: center;
  cursor: pointer;
  width: 225px;
  font: inherit;
  color: inherit;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;

  &:hover {
    transform: translateY(-4px);
  }

  &:hover .name {
    color: var(--accent);
  }

  &:hover .photo img {
    transform: scale(1.04);
  }

  .photo {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    margin-bottom: 1rem;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
  }

  .name {
    display: block;
    font-family: 'Libre Baskerville', Georgia, serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h3);
    margin: 0 0 0.4rem;
    line-height: 1.2;
    transition: color 0.3s ease;
  }

  .divider {
    display: block;
    height: 1px;
    background: var(--accent);
    width: 100%;
    margin: 0.5rem 0 1rem;
  }

  .role,
  .role-subtitle {
    display: block;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--text-micro);
    font-weight: 500;
    line-height: 1.3;
    margin: 0;
  }

  ${(p) => p.$expanded && `opacity: 0.55;`}
`;

const ArrowButton = styled.button<{ $direction: 'left' | 'right' }>`
  position: absolute;
  top: 33%;
  ${(p) => (p.$direction === 'left' ? 'left: -2.5rem;' : 'right: -2.5rem;')}
  transform: ${(p) => (p.$direction === 'left' ? 'rotate(180deg)' : 'none')};
  background: transparent;
  border: 0;
  padding: 0.25rem;
  cursor: pointer;
  z-index: 2;
  width: 2rem;
  height: 2.4rem;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 23px;
    height: 27px;
    fill: #fff;
    stroke: var(--accent);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    transition:
      fill 0.2s ease,
      transform 0.2s ease;
  }

  &:hover svg {
    fill: var(--accent);
    transform: scale(1.12);
  }
`;

const SCROLL_NUDGE = 273;

const LAYOUT_TRANSITION = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 30,
  mass: 0.9,
};

function paragraphs(bio: string | null | undefined): string[] {
  if (!bio) return [];
  return bio
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
}

const TriangleSVG = () => (
  <svg viewBox="0 0 20 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <polygon points="2,2 18,12 2,22" />
  </svg>
);

export default function LeadershipView({ team }: { team: TeamQueryResult }) {
  const members = sortObject(team) as Member[];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = members.find((m) => m.id === expandedId) ?? null;

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -SCROLL_NUDGE : SCROLL_NUDGE,
      behavior: 'smooth',
    });
  };

  return (
    <StyledLeadership>
      <div className="leadership-wrap">
        <h1>Leadership</h1>

        <BioPanelWrap>
          <AnimatePresence initial={false} mode="wait">
            {expanded && (
              <motion.div
                key={expanded.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={LAYOUT_TRANSITION}
                style={{ overflow: 'hidden' }}
              >
                <BioCard>
                  {expanded.image?.asset?._id && (
                    <div className="bio-image">
                      <SanityImage
                        image={expanded.image}
                        alt={expanded.name ?? ''}
                        width={440}
                      />
                    </div>
                  )}
                  <div>
                    <header className="bio-header">
                      <h2 className="bio-name">{expanded.name}</h2>
                      {expanded.role && (
                        <p className="bio-role">{expanded.role}</p>
                      )}
                      {expanded.roleSubtitle && (
                        <p className="bio-role-subtitle">
                          {expanded.roleSubtitle}
                        </p>
                      )}
                    </header>
                    <div className="bio-content">
                      {paragraphs(expanded.bio).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="bio-close"
                      onClick={() => setExpandedId(null)}
                    >
                      Close ↑
                    </button>
                  </div>
                </BioCard>
              </motion.div>
            )}
          </AnimatePresence>
        </BioPanelWrap>

        <CarouselWrap>
          {canLeft && (
            <ArrowButton
              $direction="left"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              type="button"
            >
              <TriangleSVG />
            </ArrowButton>
          )}
          {canRight && (
            <ArrowButton
              $direction="right"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              type="button"
            >
              <TriangleSVG />
            </ArrowButton>
          )}
          <CarouselTrack ref={trackRef}>
            {members.map((member) => {
              const isExpanded = expandedId === member.id;
              return (
                <Card
                  type="button"
                  key={member.id}
                  $expanded={isExpanded}
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedId((current) =>
                      current === member.id ? null : member.id,
                    )
                  }
                >
                  <span className="photo">
                    {member.image?.asset?._id && (
                      <SanityImage
                        image={member.image}
                        alt={member.name ?? ''}
                        width={225}
                      />
                    )}
                  </span>
                  <span className="name">{member.name}</span>
                  <span className="divider" aria-hidden="true" />
                  {member.role && <span className="role">{member.role}</span>}
                  {member.roleSubtitle && (
                    <span className="role-subtitle">{member.roleSubtitle}</span>
                  )}
                </Card>
              );
            })}
          </CarouselTrack>
        </CarouselWrap>
      </div>
    </StyledLeadership>
  );
}
