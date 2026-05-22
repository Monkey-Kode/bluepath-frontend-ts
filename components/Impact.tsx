'use client';

import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import SanityImage from '@/components/SanityImage';
import sortObject from '@/utils/sortObject';
import ImpactContent from './ImpactContent';
import ImpactHexagons from './ImpactHexagons';
import ImpactThumb from './ImpactThumb';
import type {
  PageBySlugQueryResult,
  ImpactItemsQueryResult,
  CarbonoffsetsQueryResult,
} from '@/sanity.types';

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
  if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(max-width: 600px)');
    if (!mql.matches && background) sectionBg = background;
    else if (mql.matches && mobilebackground) sectionBg = mobilebackground;
    else sectionBg = background;
  }
  const [currentThumb, setCurrentThumb] = useState<string>(
    impactItems[0]?.id ?? '',
  );
  const [activeBtn, setActiveBtn] = useState<string>(impactItems[0]?.id ?? '');
  const [firstClick, setFirstClick] = useState<boolean>(true);
  const bgColor = backgroundColor?.hex ?? '#fff';
  const thumbs = sortObject(impactItems) as ImpactItemsQueryResult;
  let index = 0;

  return (
    <div className="w-full text-center [&_h1]:text-white [&_h1]:w-full [&_h1]:mx-auto [&_h1]:mb-8 max-tablet:[&_h1]:text-[6vw] max-tablet:[&_h1]:max-w-[70vw]">
      {background?.asset?._id && (
        <SanityImage
          className="hide-for-desktop mx-[calc(50%-50vw)] my-0 w-screen max-w-[100vw] image-atop"
          image={background}
          alt="Background Impact Image"
        />
      )}
      {sectionBg ? (
        <SanityBackgroundImage
          as="section"
          id={id ?? undefined}
          image={sectionBg}
          className="impact flex-col min-h-[150vh] h-auto"
          style={{ backgroundColor: bgColor }}
        >
          <div className="impact mt-4 bg-transparent tablet:scale-80">
            <div className="w-full">
              <h1 className="text-white text-[5vw] w-full text-center [text-shadow:0_0_5px_black] pt-6 tablet:mb-0 tablet:mt-[10.5rem] tablet:text-[3vw]">
                Carbon Offset Equivalencies
              </h1>
              <ImpactHexagons carbonoffsets={carbonoffsets} />
            </div>
          </div>
          <div
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              marginTop: '10vh',
            }}
          >
            <h1 className="text-white text-[5vw] w-full text-center [text-shadow:0_0_5px_black] pt-6 tablet:mb-0 tablet:mt-[10.5rem] tablet:text-[3vw]">
              {Heading}
            </h1>
            <div className="relative flex flex-col items-center justify-center">
              <div className="grid grid-cols-[repeat(4,calc(25%-6px))] gap-1.5 mx-auto px-3 [&_h2]:text-[0.7rem] [&_h2]:mb-auto [&_h2]:pt-[0.65rem] tablet:grid-cols-[repeat(4,120px)] tablet:gap-2.5 tablet:justify-between tablet:max-w-[550px] max-tablet:[&_button]:px-2 max-tablet:[&_button]:py-[0.3rem] max-tablet:[&_h2]:text-[0.5rem] max-[320px]:grid-cols-1 max-[320px]:[&_h2]:text-[0.4rem]">
                {thumbs.map((thumb) => {
                  index += 1;
                  return (
                    <ImpactThumb
                      className={twMerge(
                        currentThumb === thumb.id && 'btn-active',
                      )}
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
              </div>
              <div className="max-tablet:relative max-tablet:pt-[6%]">
                {thumbs.map((thumb) => {
                  if (thumb.id === currentThumb) {
                    return <ImpactContent key={thumb.id} content={thumb} />;
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </SanityBackgroundImage>
      ) : (
        <section id={id ?? undefined} />
      )}
    </div>
  );
}

export default Impact;
