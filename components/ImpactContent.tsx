'use client';

import { motion } from "framer-motion";
import React from "react";
import styled from "styled-components";
import type { ImpactItemsQueryResult } from "@/sanity.types";
import formatNumber from "@/utils/formatNumber";
const StyledContentBoxes = styled.div`
  background: var(--blue);
  padding: 1rem;
  transition: opacity 0.4s ease-out;
  margin: 3rem auto;
  @media only screen and (max-width: 800px) {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: space-around;
    align-items: center;
    margin: 0 auto;
    max-width: 80vw;

    button {
      flex: 1 50%;
      max-width: calc(50% - 0.5em);
      margin-bottom: 1em;
      p {
        font-size: 3.5vw;
      }
    }

    div:first-child {
      p {
        text-align: center;
      }
    }
  }
  @media only screen and (min-width: 801px) {
    display: grid;
    grid-auto-flow: column;
    max-width: 800px;
    grid-gap: 10px;
  }

  div {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
  }

  h3 {
    margin: 0;
    font-weight: 100;
  }
  p {
    margin: 0;
    line-height: 1.3;
    font-weight: 100;
  }
  @media only screen and (max-width: 800px) {
    > div {
      padding: 1rem;
    }
  }
`;

const RightAlignedText = styled.p`
  font-weight: 800 !important;
  font-size: 0.75rem;
  text-align: left; // Default alignment

  @media (min-width: 1280px) {
    text-align: right;
  }
`;

function boxHeading(heading: string | number | null | undefined) {
  if (!heading || heading === "null") return "";
  return (
    <h3>{isNaN(Number(heading)) ? heading : formatNumber(Number(heading))}</h3>
  );
}
function ImpactContent({
  content,
}: {
  content: ImpactItemsQueryResult[number];
}) {
  const {
    content1,
    contentheading1,
    content2,
    contentheading2,
    content3,
    contentheading3,
    content4,
    contentheading4,
  } = content;
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: "110%",
      }}
      animate={{
        opacity: 1,
        y: "0%",
      }}
      exit={{
        opacity: 0,
      }}
    >
      <StyledContentBoxes id="impact-boxes">
        <div style={{ textTransform: "capitalize" }}>
          {boxHeading(String(contentheading1))}
          {content1 && (
            <>
              <RightAlignedText>{content1}</RightAlignedText>
            </>
          )}
        </div>
        <div>
          {boxHeading(String(contentheading2))}
          {content2 && <p>{content2}</p>}
        </div>
        <div>
          {boxHeading(String(contentheading3))}
          {content2 && <p>{content3}</p>}
        </div>
        <div>
          {boxHeading(String(contentheading4))}
          {content4 && <p>{content4}</p>}
        </div>
      </StyledContentBoxes>
    </motion.div>
  );
}

export default ImpactContent;
