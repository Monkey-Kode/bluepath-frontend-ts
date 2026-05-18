'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  SyntheticEvent,
} from "react";
import styled from "styled-components";
import sortObject from "@/utils/sortObject";
import TeamCard from "@/components/TeamCard";
import TeamThumbnail from "@/components/TeamThumbnail";
import SanityBackgroundImage from "@/components/SanityBackgroundImage";
import type { PageBySlugQueryResult, TeamQueryResult } from "@/sanity.types";

const StyledTeamSection = styled(SanityBackgroundImage)`
  background: rgb(24, 85, 140);
  background: linear-gradient(
    173deg,
    rgba(24, 85, 140, 1) 0%,
    rgba(116, 162, 195, 1) 32%,
    rgba(172, 208, 232, 1) 50%,
    rgba(116, 162, 195, 1) 70%,
    rgba(1, 65, 127, 1) 100%
  );
  background-attachment: fixed !important;
  &::before {
    background-attachment: fixed !important;
  }
  h2 {
    color: white;
    font-size: 3rem;
    /* font-size: clamp(2rem, 4.25vw, 4.25vw,); */
    @media only screen and (max-width: 800px) {
      font-size: 2rem;
    }
  }
  .team-wrapper {
    width: 100%;
    @media only screen and (min-width: 800px) {
      margin-top: 107px;
    }
    @media only screen and (max-width: 800px) {
      padding: 10% 5%;
    }
  }
  background-position: center bottom;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  @media only screen and (min-width: 800px) {
  }
`;

const StyledThumbs = styled.div`
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding-block-end: 0.5rem;

  /* Custom scrollbar styles */
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transaparent;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--blue);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 16px;
  align-items: start;

  @media only screen and (min-width: 769px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media only screen and (min-width: 1024px) {
    grid-auto-flow: column;
    grid-template-columns: auto;
    grid-gap: 20px;
    align-items: center;
    margin: 0 auto;
    > div {
      max-width: 200px;
      margin: 0 auto;
      scroll-snap-align: start;
    }
  }

  > div {
    height: 100%;
    @media only screen and (max-width: 1023px) {
      padding: 0;
      margin: 0 auto;
    }
  }
`;
const StyledInfos = styled.div`
  position: relative;
  width: 100%;

  margin-bottom: 3rem;
  @media only screen and (max-width: 800px) {
    margin-bottom: 0;
  }
`;

const ScrollButton = styled.button<{
  direction: "left" | "right";
  visible?: boolean;
}>`
  background: transparent;
  position: absolute;
  top: 50%;
  ${(props) => (props.direction === "left" ? "left: -20px;" : "right: -20px;")};
  transform: translateY(-50%);
  z-index: 10;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${(props) => (props.visible ? 1 : 0.5)};
  pointer-events: ${(props) => (props.visible ? "auto" : "none")};
  transition: opacity 0.3s ease;
  @media only screen and (max-width: 1023px) {
    display: none;
  }
`;

const ThumbsContainer = styled.div`
  position: relative;
  width: 100%;
  padding: 0 30px;

  @media only screen and (max-width: 1023px) {
    padding: 0;
  }
`;
const ArrowIcon = styled.svg`
  width: 24px;
  height: 24px;
`;
function Team({
  page,
  team,
}: {
  page: NonNullable<PageBySlugQueryResult>;
  team: TeamQueryResult;
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [currentSlide, setcurrentSlide] = useState("");
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
  if (typeof window !== "undefined") {
    const mql = window.matchMedia("(max-width: 600px)");
    if (!mql.matches && background) {
      sectionBg = background;
    } else if (mql.matches && mobilebackground) {
      sectionBg = mobilebackground;
    } else {
      sectionBg = background;
    }
  }

  const bgColor = backgroundColor?.hex ?? "transparent";
  const members = sortObject(team);

  useEffect(() => {
    const container = thumbsRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      // Initial check
      checkScroll();
      return () => container.removeEventListener("scroll", checkScroll);
    }
  }, [checkScroll]);

  useEffect(() => {
    const slider = document.getElementById("team-carousel");
    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    if (slider) {
      slider.addEventListener("mousedown", (e) => {
        isDown = true;
        slider.classList.add("active");
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
      });
      slider.addEventListener("mouseleave", () => {
        isDown = false;
        slider.classList.remove("active");
      });
      slider.addEventListener("mouseup", () => {
        isDown = false;
        slider.classList.remove("active");
      });
      slider.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = x - startX;
        slider.scrollLeft = scrollLeft - walk;
      });
    }
  }, []);

  const thumbsRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = thumbsRef.current;
    if (container) {
      const cardWidth = 200; // This should match your card width
      const gap = 20; // This should match your grid-gap
      const scrollAmount = cardWidth + gap;

      const newScrollPosition =
        direction === "left"
          ? container.scrollLeft - scrollAmount
          : container.scrollLeft + scrollAmount;

      container.scrollTo({
        left: newScrollPosition,
        behavior: "smooth",
      });
    }
  };
  return (
    <StyledTeamSection
      forwardedAs="section"
      id={name ?? undefined}
      image={sectionBg ?? null}
      style={{ backgroundColor: bgColor ?? undefined }}
      onClick={(e: SyntheticEvent) => {
        setcurrentSlide("");
      }}
    >
        <div id="teamWrapper" className="team-wrapper">
          <h2>{name}</h2>
          <StyledInfos>
            {members.map(({ id, image, name, role, bio, order }) => {
              if (currentSlide === id) {
                return (
                  <TeamCard
                    // currentSlide={currentSlide}
                    key={id}
                    id={id}
                    name={name}
                    image={image}
                    role={role}
                    bio={bio}
                  />
                );
              } else {
                return null;
              }
            })}
          </StyledInfos>
          <ThumbsContainer>
            <ScrollButton
              direction="left"
              onClick={() => scroll("left")}
              visible={canScrollLeft}
              aria-label="Scroll left"
            >
              ←
            </ScrollButton>
            <ScrollButton
              direction="right"
              onClick={() => scroll("right")}
              visible={canScrollRight}
              aria-label="Scroll right"
            >
              →
            </ScrollButton>
            <StyledThumbs id="team-carousel" ref={thumbsRef}>
              {members.map(({ id, image, name, role, order }) => (
                <TeamThumbnail
                  key={id}
                  id={id}
                  name={name}
                  image={image}
                  role={role}
                  setcurrentSlide={setcurrentSlide}
                />
              ))}
            </StyledThumbs>
          </ThumbsContainer>
        </div>
    </StyledTeamSection>
  );
}

export default Team;
