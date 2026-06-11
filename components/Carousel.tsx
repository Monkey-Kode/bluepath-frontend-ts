'use client';

import boxAlignClass from '@/utils/boxAlignClass';
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
  fullHeight = false,
}: {
  content: HomesectionsQueryResult[number];
  slides: CarouselQueryResult;
  fullHeight?: boolean;
}) {
  const sortedSlides = sortObject(slides) as CarouselQueryResult;

  return (
    <div id={`${content.anchorId}`}>
      {sortedSlides &&
        sortedSlides.map((content) => {
          const boxAlign = boxAlignClass(content.boxLocation);

          return (
            <SanityBackgroundImage
              key={`${content._id}_carousel`}
              image={content.image}
              width={2000}
              fullHeight={fullHeight}
              className="!bg-fixed [&:nth-child(odd)]:justify-start [&:nth-child(even)]:justify-end max-tablet:[&_[id*=_carousel]]:p-4"
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
