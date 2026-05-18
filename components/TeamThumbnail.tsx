'use client';

import { motion } from "framer-motion";
import React from "react";
import styled from "styled-components";
import fluidType from "@/utils/fluidTypography";
import scrollTo from "@/lib/scrollTo";
import SanityImage from "@/components/SanityImage";
import type { TeamQueryResult } from "@/sanity.types";

type TeamMember = TeamQueryResult[number];

const StyledThumb = styled.a`
  background: var(--blue);
  display: grid;
  grid-template-rows: auto auto auto;
  height: 100%;
  padding-top: 0;
  margin: 0 auto;
  max-width: 200px;
  width: 200px;
  @media only screen and (max-width: 1023px) {
    width: auto;
    max-width: none;
  }
  overflow: hidden;
  align-self: stretch;
  .gatsby-image-wrapper {
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border-bottom: var(--border-bottom);
    img {
      object-position: top center !important;
    }
  }
  h3 {
    ${(props) => fluidType("375px", "1400px", "11px", "16px")}
    padding:0rem 1rem;
  }
  h3,
  p {
    color: white;
    text-align: center;
    text-transform: uppercase;
    margin: 0;
  }
  p {
    text-transform: uppercase;
    font-size: clamp(0.5rem, 0.7vw, 0.8rem);
    font-weight: 100;
    padding: 0.5rem 0.5rem 0;
    @media only screen and (max-width: 800px) {
      font-weight: 400;
    }
  }
  .content {
    height: 100%;
    padding: 1rem 0.5rem 1.5rem;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
  }
`;
function TeamThumbnail({
  id,
  name,
  role,
  image,
  setcurrentSlide,
}: {
  id: TeamMember["id"];
  name: TeamMember["name"];
  role: TeamMember["role"];
  image: TeamMember["image"];
  setcurrentSlide: (id: TeamMember["id"]) => void;
}) {
  return (
    <motion.div>
      <StyledThumb
        key={id}
        href={`#${id}`}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          scrollTo("body");
          setcurrentSlide(id);
        }}
      >
        {image?.asset?._id && (
          <SanityImage image={image} alt={`${name}`} width={284} />
        )}

        <div className="content">
          <h3>{name}</h3>
          <p>{role}</p>
        </div>
      </StyledThumb>
    </motion.div>
  );
}

export default TeamThumbnail;
