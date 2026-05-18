'use client';

import React from 'react';
import styled from 'styled-components';
// import splitText from '../utils/splitText';
import { motion, AnimatePresence } from 'framer-motion';
import SanityImage from '@/components/SanityImage';
import type { TeamQueryResult } from '@/sanity.types';

type TeamMember = TeamQueryResult[number];
const StyledCard = styled.div`
  background: var(--blue);
  /* position: absolute;
  top: 0;
  left: 0; */
  height: 100%;
  /* min-height: 300px; */
  display: grid;
  grid-template-columns: 284px repeat(2, 1fr);
  grid-template-rows: 1fr 2.5fr;
  display: grid;
  /* min-height: 400px;
  height: 400px; */
  width: auto;
  @media only screen and (max-width: 800px) {
    display: flex;
    flex-direction: column;
    width: auto;
  }

  .gatsby-image-wrapper {
    grid-column: 1/2;
    grid-row: 1/4;
  }
  h3 {
    grid-column: 2/4;
    grid-row: 1/2;
    background: var(--gray);
    margin: 0;
    padding: 0.15rem 2rem;
    border-bottom: var(--border-bottom);
    color: white;
    display: flex;
    text-transform: uppercase;
    align-items: center;
    font-size: clamp(1rem, 2vw, 2rem);
    @media only screen and (max-width: 800px) {
      display: flex;
      flex-direction: column;
      text-align: center;
      padding-top: 0.34rem;
      span.role {
        padding-left: 0;
      }
    }

    .role {
      /* display: inline-block; */
      font-weight: 100;
      color: white;
      padding-left: 1rem;
      @media only screen and (max-width: 800px) {
        padding-left: 0;
        padding-top: 0.34rem;
        padding-bottom: 0.4em;
      }
    }
  }
  .content {
    grid-column: 2/4;
    grid-row: 2/4;
    color: white;
    font-weight: 100;
    line-height: 1.4;
    padding: 1rem 2rem;
    p {
      padding: 0rem 1rem 0.5rem 0rem;
      text-align: justify;
      font-size: 0.75rem;
      margin: 0;
      @media only screen and (max-width: 800px) {
        font-weight: 400;
        text-align: left;
        font-size: 0.65rem;
        word-break: break-word;
      }
    }
    @media (min-width: 500px) {
      columns: 2;
      /* display: flex;
      justify-content: space-between;
      flex-flow: row wrap;
      align-items: flex-start; */
      p {
        /* flex: 1 50%; */
      }
    }
  }
`;
function TeamCard({
  // currentSlide,
  id,
  // order,
  name,
  role,
  image,
  bio,
}: {
  id: TeamMember['id'];
  name: TeamMember['name'];
  role: TeamMember['role'];
  image: TeamMember['image'];
  bio: TeamMember['bio'];
}) {
  // const [firstColumn, secondColumn] = splitText(bio);
  const text = bio?.split('\n').filter((x) => x);
  return (
    <AnimatePresence key={id}>
      <motion.div
        initial={{
          opacity: 0,
          x: '20%',
        }}
        animate={{
          opacity: 1,
          x: '0%',
        }}
        exit={{
          opacity: 0,
          x: '20%',
        }}
        // transition={{ duration: 0.5 }}
      >
        <StyledCard id={id} key={id}>
          {image?.asset?._id && (
            <SanityImage
              image={image}
              alt={`Team ${name}`}
              width={284}
            />
          )}
          <h3>
            {name}
            <span className="role"> {role}</span>
          </h3>
          {text && (
            <div className="content">
              {text.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}

          {/* <p>{firstColumn.join('\n')}</p>
            <p>{secondColumn.join('\n')}</p> */}
        </StyledCard>
      </motion.div>
    </AnimatePresence>
  );
}

export default TeamCard;
