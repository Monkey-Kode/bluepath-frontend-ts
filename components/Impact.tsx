'use client';

import React, { useState } from "react";
import styled from "styled-components";
import SanityBackgroundImage from "@/components/SanityBackgroundImage";
import SanityImage from "@/components/SanityImage";
import sortObject from "@/utils/sortObject";
import ImpactContent from "./ImpactContent";
import ImpactHexagons from "./ImpactHexagons";
import ImpactThumb from "./ImpactThumb";
import classNames from "classnames";
import type {
  PageBySlugQueryResult,
  ImpactItemsQueryResult,
  CarbonoffsetsQueryResult,
} from "@/sanity.types";

const StyledImpactBackground = styled(SanityBackgroundImage)`
  flex-direction: column;
  min-height: 150vh;
  height: auto;
`;

const StyledImpactWrapper = styled.div`
  width: 100%;
  text-align: center;

  h1 {
    color: white;
    width: 100%;
    /* max-width: var(--small-content-width); */
    margin: 0 auto 2rem;
    @media only screen and (max-width: 800px) {
      font-size: 6vw;
      max-width: 70vw;
    }
  }
`;
const StyledInfos = styled.div`
  /* position: absolute;
  right: 0;
  top: -200%; */
  @media only screen and (max-width: 800px) {
    position: relative;
    padding-top: 6%;
  }
`;
const StyledBoxes = styled.div`
  display: grid;
  grid-template-columns: repeat(4, calc(25% - 6px));
  grid-gap: 6px;
  margin: 0 auto;
  padding-inline: 0.75rem;
  h2 {
    font-size: 0.7rem;
    margin-bottom: auto;
    padding-top: 0.65rem;
  }

  @media only screen and (min-width: 800px) {
    grid-template-columns: repeat(4, 120px);
    /* grid-auto-flow: column; */
    grid-gap: 10px;
    justify-content: space-between;
    /* align-items: stretch; */
    max-width: 550px;
  }

  @media only screen and (max-width: 800px) {
    button {
      padding: 0.3rem 0.5rem;
    }

    h2 {
      font-size: 0.5rem;
    }
  }

  @media only screen and (max-width: 320px) {
    grid-template-columns: 1fr;
    h2 {
      font-size: 0.4rem;
    }
  }
`;

const StyledContent = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* display: grid;

  align-items: center;
  grid-gap: 0px; */
`;

const StyledCarbonSection = styled.div`
  margin-top: 1rem;
  background: transparent;

  @media (min-width: 800px) {
    transform: scale(0.8);
  }

  /* background: linear-gradient(
    232deg,
    #346283 0%,
    #74a2c3 62%,
    rgb(255 255 255) 100%
  ); */
`;
const StyledCarbonContent = styled.div`
  width: 100%;
`;

const StyledHeading = styled.h1`
  color: white;
  font-size: 5vw;
  width: 100%;
  text-align: center;
  text-shadow: 0 0 5px black;
  padding-block-start: 1.5rem;
  @media only screen and (min-width: 800px) {
    margin-bottom: 0;
    margin-top: 10.5rem;
    font-size: 3vw;
  }
`;
function Impact({
  page,
  impactItems,
  carbonoffsets,
}: {
  page: NonNullable<PageBySlugQueryResult>;
  impactItems: ImpactItemsQueryResult;
  carbonoffsets: CarbonoffsetsQueryResult;
}) {
  const { Heading, background, mobilebackground, backgroundColor, id } = page;
  let sectionBg = background;
  if (typeof window !== "undefined") {
    let mql = window.matchMedia("(max-width: 600px)");
    if (!mql.matches && background) {
      sectionBg = background;
    } else if (mql.matches && mobilebackground) {
      sectionBg = mobilebackground;
    } else {
      sectionBg = background;
    }
  }
  const [currentThumb, setCurrentThumb] = useState<string>(
    impactItems[0]?.id ?? "",
  );
  const [activeBtn, setActiveBtn] = useState<string>(
    impactItems[0]?.id ?? "",
  );
  const [firstClick, setFirstClick] = useState<boolean>(true);
  const bgColor = backgroundColor?.hex ?? "#fff";
  const thumbs = sortObject(impactItems) as ImpactItemsQueryResult;
  let index = 0;
  return (
    <>
      <StyledImpactWrapper>
        {background?.asset?._id && (
          <SanityImage
            className="hide-for-desktop alignfull image-atop"
            image={background}
            alt="Background Impact Image"
          />
        )}
        {sectionBg ? (
            <StyledImpactBackground
              as="section"
              id={id ?? undefined}
              image={sectionBg}
              className="impact"
              style={{ backgroundColor: bgColor }}
            >
              <StyledCarbonSection className="impact">
                <StyledCarbonContent>
                  <StyledHeading>Carbon Offset Equivalencies</StyledHeading>
                  <ImpactHexagons carbonoffsets={carbonoffsets} />
                </StyledCarbonContent>
              </StyledCarbonSection>
              <div
                style={{
                  flexDirection: "column",
                  justifyContent: "center !important",
                  marginTop: "10vh",
                }}
              >
                <StyledHeading>{Heading}</StyledHeading>
                <StyledContent>
                  <StyledBoxes>
                    {thumbs.map((thumb) => {
                      index += 1;
                      return (
                        <ImpactThumb
                          className={classNames({
                            "btn-active": currentThumb === thumb.id,
                          })}
                          setActiveBtn={setActiveBtn}
                          id={`${index}_impact_thumb`}
                          key={thumb.id}
                          content={thumb}
                          setCurrentThumb={setCurrentThumb}
                          currentThumb={currentThumb}
                          setFirstClick={setFirstClick}
                        />
                      );
                    })}
                  </StyledBoxes>
                  <StyledInfos>
                    {thumbs.map((thumb) => {
                      if (thumb.id === currentThumb) {
                        return <ImpactContent key={thumb.id} content={thumb} />;
                      } else {
                        return null;
                      }
                    })}
                  </StyledInfos>
                </StyledContent>
              </div>
            </StyledImpactBackground>
        ) : (
          <section id={id ?? undefined}></section>
        )}
      </StyledImpactWrapper>
    </>
  );
}

export default Impact;
