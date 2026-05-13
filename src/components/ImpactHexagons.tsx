import { graphql, useStaticQuery } from "gatsby";
import { GatsbyImage } from "gatsby-plugin-image";
// import GatsbyImage from 'gatsby-plugin-image';
import React, { useState } from "react";
import styled from "styled-components";
import { hexagonGridItem } from "../styles/mixins";
import { ArrElement } from "../types";
import formatNumber from "../utils/formatNumber";
import isNumeric from "../utils/isNumber";
import sortObject from "../utils/sortObject";

const StyledHexagonsGrid = styled.div`
  display: flex;
  justify-content: center;
`;
const StyledHexWrapper = styled.ul`
  --amount: 6;
  --counter: 1;
  position: relative;
  padding: 2rem 4rem;
  width: 85vw;
  margin: 0 calc(-50vw + 50%);
  list-style-type: none;
  display: grid;
  grid-template-columns: repeat(var(--amount), 1fr 2fr) 1fr;
  grid-gap: 1rem 2rem;
  /* @media screen and (min-width: 1440px) {
    --amount: 6;
    --counter: 1;
  }
  @media screen and (min-width: 1120px) and (max-width: 1439px) {
    --amount: 4;
    --counter: 1;
  }
  @media screen and (min-width: 840px) and (max-width: 1119px) {
    --amount: 3;
    --counter: 1;
    grid-gap: 1.5rem 3rem;
  }
  @media screen and (min-width: 480px) and (max-width: 839px) {
    --amount: 2;
    --counter: 1;
    grid-gap: 1.5rem 3rem;
  } */
  @media screen and (max-width: 800px) {
    --amount: 1;
    grid-gap: 1.5rem 3rem;
  }
`;

const StyledHexItem = styled.li`
  position: relative;
  grid-column: 1 / span 3;
  grid-row: calc(var(--counter) + var(--counter)) / span 2;
  height: 0;
  padding-bottom: 90%;
  ${hexagonGridItem(20, 6)}
  /* @media screen and (min-width: 1440px) {
    ${hexagonGridItem(20, 6)}
  }
  @media screen and (min-width: 1120px) and (max-width: 1439px) {
    ${hexagonGridItem(20, 4)}
  }
  @media screen and (min-width: 840px) and (max-width: 1119px) {
    ${hexagonGridItem(20, 3)}
  }
  @media screen and (min-width: 480px) and (max-width: 839px) {
    ${hexagonGridItem(20, 2)}
  } */
  @media screen and (max-width: 800px) {
    ${hexagonGridItem(20, 1)}
    grid-row: auto !important;

    &:nth-child(1) {
      order: 2;
    }
    &:nth-child(2) {
      order: 3;
    }
    &:nth-child(3) {
      order: 6;
    }
    &:nth-child(4) {
      order: 7;
    }
    &:nth-child(5) {
      order: 9;
    }
    &:nth-child(6) {
      order: 10;
    }
    &:nth-child(7) {
      order: 1;
    }
    &:nth-child(8) {
      order: 4;
    }
    &:nth-child(9) {
      order: 5;
    }
    &:nth-child(10) {
      order: 8;
    }
  }
`;

const StyledHexContent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  padding: 2rem 25%;
  clip-path: polygon(75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%, 25% 0);
  text-align: center;
  transform: scale(1.075);
  @media only screen and (min-width: 1600px) {
    transform: scale(1.05);
  }
  @media only screen and (min-width: 1200px) and (max-width: 1600px) {
    transform: scale(1.1);
  }
  @media only screen and (min-width: 800px) and (max-width: 1199px) {
    transform: scale(1.12);
  }
  &[style*=" rgb(0, 65, 129)"] {
    @media only screen and (max-width: 1600px) {
      padding: 2rem 12%;
    }
    @media only screen and (max-width: 479px) {
      padding: 2rem 20%;
    }
  }

  > div {
    height: 100%;
  }
  figure {
    display: flex;
    align-items: center;
    height: 100%;
  }
  img {
    height: auto;
    width: 100%;
  }
  h3 {
    margin-bottom: 0.3rem;
    font-size: 1rem;
    @media only screen and (min-width: 901px) and (max-width: 1600px) {
      font-size: 1rem;
    }
    @media only screen and (min-width: 800px) and (max-width: 900px) {
      font-size: 0.5rem;
    }
    @media only screen and (max-width: 799px) {
      margin-bottom: 0.8rem;
      font-size: 5vw;
    }
  }
  p {
    line-height: 1.4;
    font-size: 0.85rem;
    @media only screen and (min-width: 1404px) and (max-width: 1600px) {
      font-size: 0.7rem;
    }
    @media only screen and (min-width: 1275px) and (max-width: 1403px) {
      font-size: 0.6rem;
    }
    @media only screen and (min-width: 901px) and (max-width: 1274px) {
      font-size: 0.5rem;
    }
    @media only screen and (min-width: 800px) and (max-width: 900px) {
      font-size: 0.25rem;
    }
    @media only screen and (max-width: 799px) {
      font-size: 1.4rem;
    }
    @media only screen and (max-width: 484px) {
      font-size: 0.45rem;
      line-height: 1.3;
    }
  }
  h3,
  p {
    color: white;
    font-weight: 100;
  }
  p {
    @media only screen and (max-width: 799px) {
      font-weight: 400;
    }
  }
`;

const StyledTabs = styled.ul`
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  max-width: 100%;
  width: auto;
  margin-bottom: 0;
  @media only screen and (max-width: 800px) {
    margin: 0;
  }
  li {
    list-style: none;
    @media only screen and (max-width: 800px) {
      margin: 0 auto;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    button {
      appearance: none;
      background: transparent;
      color: white;
      border: none;
      font-size: 1rem;
      padding: 1rem 2rem;
      font-weight: 800;
      background: rgba(0, 65, 129, 0.75);
      @media only screen and (max-width: 800px) {
        padding: 0.4rem;
        font-size: 0.69rem;
      }
      &:active {
        border: none;
        outline: 0;
      }
      &.active {
        background: rgba(0, 65, 129, 1);
        border: 1px solid var(--accent);
      }
    }
  }
`;
function getHexagonContent(
  hexagon: ArrElement<
    ArrElement<
      Queries.ImpactHexagonsQuery["allSanityCarbonoffsets"]["nodes"]
    >["hexagons"]
  >,
) {
  if (hexagon?.icon) {
    return (
      hexagon?.icon?.asset?.gatsbyImageData && (
        <figure>
          <GatsbyImage
            image={hexagon.icon.asset.gatsbyImageData}
            alt={hexagon.heading || "carbon offset"}
          />
        </figure>
      )
    );
  } else if (hexagon?.content) {
    return (
      <div
        style={{
          display: "flex",
          flexFlow: "column nowrap",
          justifyContent: "center",
        }}
      >
        <h3>
          {isNumeric(hexagon.heading)
            ? formatNumber(Number(hexagon.heading))
            : hexagon.heading}
        </h3>
        <p>{hexagon.content}</p>
      </div>
    );
  }
}
function ImpactHexagons() {
  const [currentTab, setcurrentTab] = useState(
    "-6d3e02d6-0741-51cd-8588-f975c6e94978",
  );
  const { allSanityCarbonoffsets }: Queries.ImpactHexagonsQuery =
    useStaticQuery(graphql`
      query ImpactHexagons {
        allSanityCarbonoffsets {
          nodes {
            _key
            id
            name
            order
            hexagons {
              _id
              _key
              heading
              order
              name
              icon {
                asset {
                  gatsbyImageData(
                    width: 200
                    placeholder: BLURRED
                    layout: CONSTRAINED
                  )
                }
              }
              content
              backgroundColor {
                hex
              }
            }
          }
        }
      }
    `);
  const tabs = sortObject(
    allSanityCarbonoffsets.nodes,
  ) as Queries.ImpactHexagonsQuery["allSanityCarbonoffsets"]["nodes"];

  return (
    <div>
      <nav>
        <StyledTabs>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                className={currentTab === tab.id ? "active" : ""}
                onClick={() => setcurrentTab(tab.id)}
              >
                {tab.name}
              </button>
            </li>
          ))}
        </StyledTabs>
      </nav>
      <StyledHexagonsGrid>
        {tabs
          .filter((t) => t.id === currentTab)
          .map((tab) => {
            const hexagons = sortObject(tab.hexagons) as ArrElement<
              Queries.ImpactHexagonsQuery["allSanityCarbonoffsets"]["nodes"]
            >["hexagons"];
            return (
              <StyledHexWrapper key={tab.id}>
                {hexagons?.map(
                  (
                    hexagon: ArrElement<
                      ArrElement<
                        Queries.ImpactHexagonsQuery["allSanityCarbonoffsets"]["nodes"]
                      >["hexagons"]
                    >,
                  ) => {
                    const bgColor = hexagon?.backgroundColor
                      ? hexagon?.backgroundColor.hex
                      : "#ffffff";
                    return (
                      <StyledHexItem key={hexagon?._key ?? tab.id}>
                        <StyledHexContent
                          style={bgColor ? { background: bgColor } : {}}
                        >
                          {getHexagonContent(hexagon)}
                        </StyledHexContent>
                      </StyledHexItem>
                    );
                  },
                )}
              </StyledHexWrapper>
            );
          })}
      </StyledHexagonsGrid>
    </div>
  );
}

export default ImpactHexagons;
