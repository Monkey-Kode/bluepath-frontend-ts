import React, { useEffect, useRef, useState } from "react";
import { ArrElement } from "../types";
import styled, { keyframes } from "styled-components";
import NationalProjects, { CaseStudy } from "./NationalProjects";
import { hardcodedSections } from "../data";
import { InViewHookResponse } from "react-intersection-observer";
import TriangleOutline from "../images/triangle-outline.svg";
// import logRefProperties from "../utils/logRefProperties";

const StyledRoot = styled.div`
  --color-blue: #1d4483;
  --font-thin: 300;
  display: grid;
  align-items: center;
  min-height: 100vh;
  overflow-x: hidden;
  max-width: 100%;
  padding-block-start: 2.25rem;
  @media (min-width: 1280px) {
    padding-block-start: 6.793125rem;
    padding-block-end: 0;
    padding-inline: 2rem;
  }
`;

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: auto; // This makes rows automatically adjust to their content
  justify-content: center;
  align-items: center;
  place-items: center;
  place-content: center;
  gap: 1rem;
  max-width: 100%;
  @media (min-width: 1280px) {
    grid-template-columns: 4fr 6fr;
    transform: translateY(-5rem);
  }
`;

const DiagLinesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none"><path stroke="#1D4483" stroke-miterlimit="10" d="m1.31 1.03 33.75 33.76"/></svg>`;

const StyleLeftContent = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin-block-end: 0.5rem;
  overflow: hidden;
`;

const StyleOuterBox = styled.div`
  --item-size: 2.25rem;
  --box-size: 14rem;
  --border-size: 2.11rem;
  --max-height: calc(var(--box-size) - var(--border-size));
  max-width: 100%;
  min-width: var(--box-size);
  min-height: var(--box-size);
  max-height: var(--max-height);
  overflow: hidden;
  position: relative;

  // Bottom-left corner
  &::before {
    content: url("data:image/svg+xml;base64,${btoa(DiagLinesSvg)}");
    position: absolute;
    bottom: 0;
    left: 0;
    width: var(--item-size);
    height: var(--item-size);
    transform: rotate(0deg);
  }

  // Bottom-right corner
  &::after {
    content: url("data:image/svg+xml;base64,${btoa(DiagLinesSvg)}");
    position: absolute;
    bottom: 0;
    right: 0;
    width: var(--item-size);
    height: var(--item-size);
    transform: rotate(-90deg);
  }
  @media (min-width: 1280px) {
    --box-size: 18.125rem;
    max-width: var(--box-size);
  }
`;

const StyledBox = styled.div`
  min-width: var(--box-size);
  min-height: var(--box-size);
  max-width: var(--box-size);
  max-height: var(--max-height);
  overflow: hidden;
  position: relative;
  padding-inline: calc(var(--border-size) / 2);
  display: flex;
  align-items: center;
  justify-content: center;
  place-content: center;
  place-items: center;
  // Top-left corner
  &::before {
    content: url("data:image/svg+xml;base64,${btoa(DiagLinesSvg)}");
    position: absolute;
    top: 0;
    left: 0;
    width: var(--item-size);
    height: var(--item-size);
    transform: rotate(90deg);
    @media (min-width: 1280px) {
      --item-size: 2.25rem;
    }
  }

  // Top-right corner
  &::after {
    content: url("data:image/svg+xml;base64,${btoa(DiagLinesSvg)}");
    position: absolute;
    top: 0;
    right: 0;
    width: var(--item-size);
    height: var(--item-size);
    transform: rotate(180deg);
  }
  @media (min-width: 1280px) {
    max-width: 18.125rem;
  }
`;

const ScrollableContent = styled.div`
  --scrollbar-width: 0.225625rem;
  max-height: var(--max-height);
  max-width: 80vw;
  overflow: hidden;
  cursor: pointer;

  @media (min-width: 1280px) {
    overflow-y: scroll;
    /* Ensure scrollbar is always visible in WebKit browsers (like Chrome) */
    &::-webkit-scrollbar {
      width: var(--scrollbar-width); /* Adjust width as needed */
    }

    &::-webkit-scrollbar-track {
      background: transparent; /* Optional: Set track background */
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--blue); /* Use custom color */
      border-radius: 6px; /* Optional: Round the edges */
      border: var(--scrollbar-width) solid transparent; /* To add some padding */
    }

    /* For Firefox */
    scrollbar-width: thin;
    scrollbar-color: var(--blue) transparent;
  }
`;

const DownArrow = styled.div`
  position: absolute;
  bottom: 15%;
  left: 50%;
  font-size: 1.5rem; /* Adjust the font size as needed */
  color: var(--blue);
  transition: opacity 0.3s ease; /* Smooth transition */
  opacity: 1;
  height: 57.79px;
  width: 67.49px;
  transform: translateX(-50%) scale(0.5);
  pointer-events: none;
  &.hidden {
    opacity: 0;
  }
  @media (max-width: 1200px) {
    transform: translateX(-50%) scale(0.3);
    bottom: 0%;
  }
  @media (max-width: 1024px) {
    display: none;
  }
`;

const Heading = styled.h2`
  font-family: 'Lora', Georgia, serif;
  font-size: 2.25rem;
  margin-bottom: 1.25rem;
  color: var(--color-blue);
  text-align: center;
  font-weight: 500;
  line-height: 1.15;
  padding-block-start: 1.75rem;
  padding-inline: 0.5rem;
  @media (max-width: 1200px) {
    font-size: 1.875rem;
    padding-block-start: 0.25rem;
  }
  @media (max-width: 1024px) {
    font-size: 1.75rem;
  }
`;

const Content = styled.p`
  display: none;
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  text-align: center;
  margin-bottom: 20px;
  color: var(--color-blue);
  font-weight: 400;
  line-height: 1.65;
  padding-block-start: 1.25rem;
  @media (min-width: 1280px) {
    display: block;
  }
`;

export const MobileContent = styled(Content)`
  display: block;
  padding-inline: 2rem;
  @media (min-width: 1280px) {
    display: none;
  }
`;

const SectionList = styled.ul`
  --box-size: 18.125rem;
  --list-inline-padding: 0;
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, 25%);
  gap: 0.5rem;
  padding-inline: var(--list-inline-padding);
  max-width: calc(100% - calc(var(--list-inline-padding) * 2));
  place-content: center;
  place-items: center;
  justify-content: center;
  align-items: center;
  @media (min-width: 1280px) {
    grid-template-columns: 1fr; // Single column for larger screens
    grid-column: 2 / -1; // This will apply only on larger screens
    gap: 0; // Remove gap for single column layout
  }
  @media (min-width: 467px) and (max-width: 1024px) {
    --list-inline-padding: 3.25rem;
  }
  @media (max-width: 466px) {
    --list-inline-padding: 2rem;
  }
  @media (max-width: 320px) {
    --list-inline-padding: 0.5rem;
    grid-template-columns: repeat(
      2,
      50%
    ); // Switch to 2 columns for very small screens
    gap: 0.25rem;
  }
`;

const panAnimation = keyframes`
  0%, 100% {
    background-position: left center;
  }
  50% {
    background-position: right center;
  }
`;

const StyledBackgroundFigure = styled.div<{ imageUrl: string }>`
  margin: 0;
  width: var(--square-size);
  height: var(--square-size);
  overflow: hidden;
  mask-size: 100% 100%;
  position: relative;
  clip-path: url("#mobile-clipPath");
  background-image: url(${(props) => props.imageUrl});
  background-size: cover;
  background-repeat: no-repeat;
  background-position: left center; /* Ensure initial position */
  cursor: pointer;
  @media (min-width: 1280px) {
    margin-right: 10px;
    clip-path: url("#clipPath");
  }
`;

// Style the SectionItem
const SectionItem = styled.li`
  --square-size: 62px;
  display: grid;
  align-items: center;
  grid-template-columns: 1fr;
  margin-bottom: 10px;
  width: 100%;
  // Add hover state for the SectionItem
  &:hover {
    ${StyledBackgroundFigure} {
      animation: ${panAnimation} 5s linear infinite;
      animation-play-state: running;
    }
  }
  @media (min-width: 1280px) {
    --square-size: 96.21px;
    grid-template-columns: var(--square-size) 3fr;
  }
`;

// Style the background image container

const SectionLink = styled.a`
  display: none;
  @media (min-width: 1280px) {
    font-family: 'Lora', Georgia, serif;
    text-decoration: none;
    color: var(--color-blue);
    font-size: 3.5rem;
    font-weight: 500;
    padding-left: 2rem;
    display: inline-block;
    transition: all 0.3s ease;
    &:hover {
      color: var(--orange);
      transform: scale(1.04);
    }
  }
`;

const StyledNationalProjectsWrapper = styled.div`
  grid-column: 1 / -1;
  display: none; // Hide by default

  @media (max-width: 1024px) {
    display: block; // Show on screens up to 1024px wide
  }

  @media (max-width: 1024px) {
    margin-inline: 1.5rem;
  }
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
  const [isArrowVisible, setIsArrowVisible] = useState(true);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const isScrollingRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scrollableElement = scrollableRef.current;
    if (!scrollableElement) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      const isAtTop = scrollTop === 0;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;
      const isScrolling = scrollTop !== lastScrollTopRef.current;

      if (isScrolling) {
        isScrollingRef.current = true;
        setIsArrowVisible(false);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      }

      if (isAtTop) {
        setIsArrowVisible(true);
      } else if (isAtBottom) {
        setIsArrowVisible(false);
      } else if (!isScrolling && isScrollingRef.current) {
        isScrollingRef.current = false;
        hideTimeoutRef.current = setTimeout(() => {
          setIsArrowVisible(true);
        }, 1000); // Hide arrow after 1 second of inactivity
      }

      lastScrollTopRef.current = scrollTop;
      rafIdRef.current = requestAnimationFrame(checkScrollPosition);
    };

    rafIdRef.current = requestAnimationFrame(checkScrollPosition);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={tableOfContentsRef.ref}>
      <StyledRoot id={anchorId ?? "tof"}>
        <TopSection>
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <clipPath id="mobile-clipPath">
                <path d="M61.19 54.02V7.3L54.23.34H7.48L.48 7.33v46.67L7.54 61.07h46.63l7.02-7.02Z" />
              </clipPath>
            </defs>
          </svg>
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <clipPath id="clipPath">
                <path d="M94.96 83.83V11.32L84.15.52H11.61L.75 11.37v72.41L11.7 94.73h72.36l10.9-10.9Z" />
              </clipPath>
            </defs>
          </svg>
          <StyleLeftContent>
            <StyleOuterBox>
              <StyledBox>
                <ScrollableContent ref={scrollableRef}>
                  <Heading>{sectionHeading}</Heading>
                  <Content>{sectionContent}</Content>
                  <DownArrow className={isArrowVisible ? "" : "hidden"}>
                    <TriangleOutline className="jump-down" />
                  </DownArrow>
                </ScrollableContent>
              </StyledBox>
            </StyleOuterBox>
          </StyleLeftContent>
          <SectionList>
            {hardcodedSections.map((section, index) => (
              <SectionItem key={index}>
                <StyledBackgroundFigure imageUrl={section.image.imageUrl} />
                <SectionLink href={`#${section.anchorId}`}>
                  {section.heading}
                </SectionLink>
              </SectionItem>
            ))}
          </SectionList>
          <MobileContent>{sectionContent}</MobileContent>
        </TopSection>
        <StyledNationalProjectsWrapper>
          <NationalProjects caseStudies={caseStudies} />
        </StyledNationalProjectsWrapper>
      </StyledRoot>
    </div>
  );
}
