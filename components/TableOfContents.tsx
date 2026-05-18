'use client';

import React from "react";
import styled, { keyframes } from "styled-components";
import { hardcodedSections } from "@/lib/homeSections";
import { InViewHookResponse } from "react-intersection-observer";

const StyledRoot = styled.div`
  --color-blue: #1d4483;
  min-height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  padding-block: 2rem;
  padding-inline: 1.5rem;
  overflow-x: hidden;

  @media (min-width: 1280px) {
    min-height: calc(100vh - var(--header-height));
    padding-inline: 4rem;
  }
`;

const Heading = styled.h2`
  font-family: 'Libre Baskerville', Georgia, serif;
  font-weight: 800;
  color: var(--color-blue);
  text-align: center;
  line-height: 1.05;
  margin: 0 0 2rem;
  text-wrap: balance;
  max-width: 1100px;
  font-size: var(--text-h1);

  @media (min-width: 1440px) {
    font-size: var(--text-display);
  }
`;

const Divider = styled.hr`
  width: 100%;
  max-width: 750px;
  border: 0;
  border-top: 1px solid var(--accent);
  margin: 0;
`;

const TilesRow = styled.ul`
  list-style: none;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2.5rem;
  padding: 2rem 0;
  margin: 0;
  width: 100%;
  max-width: 1100px;
  flex-wrap: wrap;

  @media (max-width: 800px) {
    gap: 0.25rem;
    padding: 1.25rem 0;
  }
`;

const panAnimation = keyframes`
  0%, 100% { background-position: left center; }
  50% { background-position: right center; }
`;

const Tile = styled.li`
  margin: 0;
  padding: 0;
  position: relative;

  &:hover figure {
    animation: ${panAnimation} 5s linear infinite;
  }

  &:hover figure::after {
    background-color: rgba(0, 0, 0, 0.15);
  }

  &:hover span {
    opacity: 1;
  }
`;

const TileFigure = styled.figure<{ imageUrl: string }>`
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0;
  background-image: url(${(p) => p.imageUrl});
  background-size: cover;
  background-position: left center;
  background-repeat: no-repeat;
  clip-path: url('#tofClipPath');

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.25);
    transition: background-color 0.3s ease;
  }

  @media (max-width: 800px) {
    width: 80px;
    height: 80px;
  }
`;

const TileLink = styled.a`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  padding: 0;
`;

const TileLabel = styled.span`
  color: #fff;
  text-transform: uppercase;
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  font-weight: 600;
  letter-spacing: 0;
  text-align: center;
  line-height: 1.1;
  font-size: clamp(0.75rem, 0.6rem + 0.6vw, 0.85rem);
  padding-inline: 0.25rem;
  opacity: 1;
  transition: opacity 0.3s ease;
`;

const Body = styled.div`
  max-width: 680px;
  text-align: center;
  padding: 2rem 0;
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  color: #000;
  line-height: 1.6;
  font-size: var(--text-h4);
  text-wrap: pretty;

  @media (min-width: 1440px) {
    font-size: var(--text-h3);
  }

  p {
    margin: 0 0 1rem;
    color: #000;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const TriangleWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 1rem 0 2rem;

  svg {
    width: 23px;
    height: 27px;
    fill: #fff;
    stroke: var(--accent);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    transform: rotate(90deg);
  }
`;

export default function TableOfContents({
  content,
  tableOfContentsRef,
}: {
  content: import('@/sanity.types').HomesectionsQueryResult[number];
  tableOfContentsRef: InViewHookResponse;
}) {
  const { anchorId, sectionContent, sectionHeading } = content;

  const paragraphs = (sectionContent ?? "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div ref={tableOfContentsRef.ref}>
      <StyledRoot id={anchorId ?? "tof"}>
        {/* Hidden SVG defs for the hex/diamond clip path. Single path with all
            four corners chamfered; using objectBoundingBox so the same path
            scales to any tile size. */}
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <clipPath id="tofClipPath" clipPathUnits="objectBoundingBox">
              <path d="M0.992,0.876 V0.124 L0.876,0.008 H0.124 L0.008,0.124 V0.876 L0.124,0.992 H0.876 L0.992,0.876 Z" />
            </clipPath>
          </defs>
        </svg>

        {sectionHeading && <Heading>{sectionHeading}</Heading>}

        <Divider />
        <TilesRow>
          {hardcodedSections.map((section) => (
            <Tile key={section.anchorId}>
              <TileFigure
                imageUrl={section.image.imageUrl}
                aria-label={section.image.alt}
                role="img"
              />
              <TileLink href={`#${section.anchorId}`}>
                <TileLabel>{section.heading}</TileLabel>
              </TileLink>
            </Tile>
          ))}
        </TilesRow>
        <Divider />

        {paragraphs.length > 0 && (
          <Body>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Body>
        )}

        <TriangleWrap>
          <svg
            viewBox="0 0 20 24"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <polygon points="2,2 18,12 2,22" />
          </svg>
        </TriangleWrap>
      </StyledRoot>
    </div>
  );
}
