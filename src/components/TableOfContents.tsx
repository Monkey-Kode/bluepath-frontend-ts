import React from "react";
import { ArrElement } from "../types";
import styled, { keyframes } from "styled-components";
import NationalProjects, { CaseStudy } from "./NationalProjects";
import { hardcodedSections } from "../data";
import { InViewHookResponse } from "react-intersection-observer";

const StyledRoot = styled.div`
  --color-blue: #1d4483;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100%;
  padding-block-start: 2rem;
  padding-block-end: 0;
  padding-inline: 1.5rem;
  overflow-x: hidden;

  @media (min-width: 1280px) {
    padding-block-start: 5rem;
    padding-inline: 4rem;
  }
`;

const Heading = styled.h2`
  font-family: 'Lora', Georgia, serif;
  font-weight: 800;
  color: var(--color-blue);
  text-align: center;
  line-height: 1.05;
  margin: 0 0 2rem;
  text-wrap: balance;
  max-width: 1100px;
  font-size: clamp(2rem, 4vw, 4rem);

  @media (min-width: 1280px) {
    font-size: 4rem;
  }
`;

const Divider = styled.hr`
  width: 100%;
  max-width: 750px;
  border: 0;
  border-top: 1px solid var(--orange);
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
`;

const TileFigure = styled.figure<{ imageUrl: string }>`
  width: 140px;
  height: 140px;
  margin: 0;
  background-image: url(${(p) => p.imageUrl});
  background-size: cover;
  background-position: left center;
  background-repeat: no-repeat;
  clip-path: url('#tofClipPath');

  @media (max-width: 800px) {
    width: 80px;
    height: 80px;
  }
`;

const VisuallyHiddenLink = styled.a`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  text-indent: -9999px;
  white-space: nowrap;
  color: transparent;
  text-decoration: none;
  padding: 0;
  display: block;
`;

const Body = styled.div`
  max-width: 900px;
  text-align: center;
  padding: 2rem 0;
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  color: var(--color-blue);
  line-height: 1.6;
  font-size: 1rem;

  p {
    margin: 0 0 1rem;
    color: var(--color-blue);

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
    stroke: var(--orange);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    transform: rotate(90deg);
  }
`;

const NationalProjectsWrap = styled.div`
  width: 100%;
  max-width: 1400px;
`;

export default function TableOfContents({
  content,
  caseStudies,
  tableOfContentsRef,
}: {
  content: ArrElement<Queries.HomeMainQuery["allSanityHomesections"]["nodes"]>;
  caseStudies: CaseStudy[];
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
              <VisuallyHiddenLink href={`#${section.anchorId}`}>
                {section.heading}
              </VisuallyHiddenLink>
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

        <NationalProjectsWrap>
          <NationalProjects caseStudies={caseStudies} />
        </NationalProjectsWrap>
      </StyledRoot>
    </div>
  );
}
