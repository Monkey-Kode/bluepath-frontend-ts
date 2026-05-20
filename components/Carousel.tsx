'use client';

import sortObject from '@/utils/sortObject';
import CarouselSlide from './CarouselSlide';
import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import type {
  HomesectionsQueryResult,
  CarouselQueryResult,
} from '@/sanity.types';

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
            <SanityBackgroundImage
              key={`${content._id}_carousel`}
              image={content.image}
              width={2000}
              className="h-full !bg-fixed [&:nth-child(odd)]:justify-start [&:nth-child(even)]:justify-end max-tablet:[&_[id*=_carousel]]:p-4"
            >
              <div className={boxAlign}>
                <CarouselSlide allContent={content} />
              </div>
            </SanityBackgroundImage>
          );
        })}
    </div>
  );
}

export default Carousel;
