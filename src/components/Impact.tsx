import { graphql, useStaticQuery } from "gatsby";
import React, { useState } from "react";
import styled from "styled-components";
import StyleBackgroundImage from "../styles/StyleBackgroundImage";
import sortObject from "../utils/sortObject";
import ImpactContent from "./ImpactContent";
import ImpactHexagons from "./ImpactHexagons";
import ImpactThumb from "./ImpactThumb";
import classNames from "classnames";
import { GatsbyImage, getImage } from "gatsby-plugin-image";
import { convertToBgImage } from "gbimage-bridge";

const StyledImpactBackground = styled(StyleBackgroundImage)`
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
function Impact({ sanityPage }: { sanityPage: Queries.SanityPage }) {
  const { Heading, background, mobilebackground, backgroundColor, id } =
    sanityPage;
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
    "-99c5c5d6-76bc-5870-8067-abc53e38ca86",
  );
  const [activeBtn, setActiveBtn] = useState<string>(
    "-99c5c5d6-76bc-5870-8067-abc53e38ca86",
  );
  const [firstClick, setFirstClick] = useState<boolean>(true);
  const {
    allSanityImpact: { nodes },
  }: Queries.ImpactQuery = useStaticQuery(graphql`
    query Impact {
      allSanityImpact {
        nodes {
          content1
          content2
          content3
          content4
          contentheading1
          contentheading2
          contentheading3
          contentheading4
          id
          image {
            asset {
              gatsbyImageData(
                width: 50
                placeholder: BLURRED
                layout: CONSTRAINED
              )
            }
          }
          name
          order
        }
      }
    }
  `);
  const bgColor = backgroundColor?.hex ?? "#fff";
  const thumbs = sortObject(
    nodes,
  ) as Queries.ImpactQuery["allSanityImpact"]["nodes"];
  let index = 0;
  const image = sectionBg?.asset?.gatsbyImageData
    ? getImage(sectionBg?.asset?.gatsbyImageData)
    : null;
  const bgImage = image ? convertToBgImage(image) : null;
  return (
    <>
      <StyledImpactWrapper>
        {background?.asset?.gatsbyImageData && (
          <GatsbyImage
            className="hide-for-desktop alignfull image-atop"
            image={background?.asset?.gatsbyImageData}
            alt="Background Impact Image"
          />
        )}
        {sectionBg ? (
          <StyledImpactBackground
            id={id ?? undefined}
            Tag="section"
            {...bgImage}
            backgroundColor={bgColor}
            className="impact"
          >
            <StyledCarbonSection className="impact">
              <StyledCarbonContent>
                <StyledHeading>Carbon Offset Equivalencies</StyledHeading>
                <ImpactHexagons />
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
