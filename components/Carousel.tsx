'use client';

import React from 'react';
import styled from 'styled-components';
import sortObject from '@/utils/sortObject';
import CarouselSlide from './CarouselSlide';
import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import type {
  HomesectionsQueryResult,
  CarouselQueryResult,
} from '@/sanity.types';

const StyledBackgroundImage = styled(SanityBackgroundImage)`
  height: 100%;
  background-attachment: fixed !important;
  &:nth-child(odd) {
    justify-content: flex-start;
  }
  &:nth-child(even) {
    justify-content: flex-end;
  }
  /* div:not(.Enabling_wrapper) {
    justify-content: flex-end !important;
  } */

  @media only screen and (max-width: 800px) {
    div[id*='_carousel'] {
      padding: 1rem;
    }
  }
`;

function Carousel({
  content,
  slides,
}: {
  content: HomesectionsQueryResult[number];
  slides: CarouselQueryResult;
}) {
  const sortedSlides = sortObject(slides) as CarouselQueryResult;
  let boxAlign = 'left';

  return (
    <div id={`${content.anchorId}`}>
      {sortedSlides &&
        sortedSlides.map((content) => {
          if (content.boxLocation) {
            boxAlign = content.boxLocation;
          }

          return (
            <StyledBackgroundImage
              key={`${content._id}_carousel`}
              image={content.image}
              width={2000}
            >
              <div className={boxAlign}>
                <CarouselSlide allContent={content} />
              </div>
            </StyledBackgroundImage>
          );
        })}
    </div>
  );
}

export default Carousel;
