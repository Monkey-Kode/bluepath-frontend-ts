import React, { useCallback, useEffect, useRef, useState } from 'react';
import { graphql, type PageProps, type HeadProps } from 'gatsby';
import { GatsbyImage, getImage, type IGatsbyImageData } from 'gatsby-plugin-image';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import sortObject from '../utils/sortObject';
import { headerOffset } from '../styles/mixins';

type TeamNode = {
  id: string;
  name?: string | null;
  role?: string | null;
  bio?: string | null;
  order?: number | null;
  image?: {
    asset?: { gatsbyImageData?: IGatsbyImageData | null } | null;
  } | null;
};

type LeadershipData = { allSanityTeam: { nodes: TeamNode[] } };

const StyledLeadership = styled.main`
  background: #fff;
  color: var(--blue);
  ${headerOffset}
  padding-bottom: 5rem;
  padding-inline: 1.25rem;
  position: relative;

  .leadership-wrap {
    max-width: 1400px;
    margin: 0 auto;
    min-height: 100vh;
  }

  h1 {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    letter-spacing: 0.02em;
    font-size: var(--text-h1);
    line-height: 1.1;
    margin: 0 2.5rem 2.5rem;
  }
`;

const BioPanelWrap = styled.div`
  margin-inline: 2.5rem;
  /* No fixed margin-bottom — the inner motion.div owns its height (including
     bottom spacing) so closing the bio collapses to zero with no leftover gap. */
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

    .gatsby-image-wrapper,
    .gatsby-image-wrapper img {
      width: 100%;
      height: 100%;
    }

    img {
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

  .bio-role {
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
      color: var(--orange);
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
  gap: 3rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding-block-end: 0.75rem;

  /* Custom orange scrollbar */
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 65, 129, 0.06);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--orange);
    border-radius: 4px;
  }
  scrollbar-color: var(--orange) rgba(0, 65, 129, 0.06);
  scrollbar-width: thin;

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

  .photo {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    margin-bottom: 1rem;
    .gatsby-image-wrapper,
    .gatsby-image-wrapper img {
      width: 100%;
      height: 100%;
    }
    img {
      object-fit: cover;
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
  }

  .divider {
    display: block;
    height: 1px;
    background: var(--orange);
    width: 100%;
    margin: 0.5rem 0;
  }

  .role {
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
  transform: ${(p) =>
    p.$direction === 'left' ? 'rotate(180deg)' : 'none'};
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
    stroke: var(--orange);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    transition:
      fill 0.2s ease,
      transform 0.2s ease;
  }

  &:hover svg {
    fill: var(--orange);
    transform: scale(1.12);
  }
`;

const SCROLL_NUDGE = 273; // Card width (225) + gap (3rem = 48)

// Spring tuned for smooth, interruptible layout shifts. Framer's spring is
// inherently cancelable — re-toggling the bio mid-animation continues from the
// current position rather than restarting.
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
  <svg
    viewBox="0 0 20 24"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <polygon points="2,2 18,12 2,22" />
  </svg>
);

const LeadershipPage = ({
  data,
  location,
}: PageProps<LeadershipData>) => {
  const members = sortObject(data.allSanityTeam.nodes) as TeamNode[];
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
    <div>
      <Header location={location} />
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
                    {expanded.image?.asset?.gatsbyImageData && (
                      <div className="bio-image">
                        <GatsbyImage
                          image={
                            getImage(expanded.image.asset.gatsbyImageData)!
                          }
                          alt={expanded.name ?? ''}
                        />
                      </div>
                    )}
                    <div>
                      <header className="bio-header">
                        <h2 className="bio-name">{expanded.name}</h2>
                        {expanded.role && (
                          <p className="bio-role">{expanded.role}</p>
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
                const img = member.image?.asset?.gatsbyImageData
                  ? getImage(member.image.asset.gatsbyImageData)
                  : null;
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
                      {img && (
                        <GatsbyImage image={img} alt={member.name ?? ''} />
                      )}
                    </span>
                    <span className="name">{member.name}</span>
                    <span className="divider" aria-hidden="true" />
                    {member.role && <span className="role">{member.role}</span>}
                  </Card>
                );
              })}
            </CarouselTrack>
          </CarouselWrap>
        </div>
      </StyledLeadership>
      <Footer location={location} />
    </div>
  );
};

export const Head = ({ location }: HeadProps) => (
  <SEO
    title="Leadership"
    description="The team behind BluePath Finance."
    location={location as Location}
  />
);

export const query = graphql`
  query Leadership {
    allSanityTeam {
      nodes {
        id
        name
        role
        bio
        order
        image {
          asset {
            gatsbyImageData(width: 600, layout: CONSTRAINED, placeholder: BLURRED)
          }
        }
      }
    }
  }
`;

export default LeadershipPage;
