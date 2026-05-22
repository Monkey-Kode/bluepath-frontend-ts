'use client';

import { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import SanityImage from '@/components/SanityImage';
import formatNumber from '@/utils/formatNumber';
import { hexagonGridItem } from '@/utils/hexagonGridItem';
import isNumeric from '@/utils/isNumber';
import sortObject from '@/utils/sortObject';
import type { CarbonoffsetsQueryResult } from '@/sanity.types';

function getHexagonContent(
  hexagon: NonNullable<CarbonoffsetsQueryResult[number]['hexagons']>[number],
) {
  if (hexagon?.icon) {
    return (
      hexagon?.icon?.asset?._id && (
        <figure>
          <SanityImage
            image={hexagon.icon}
            alt={hexagon.heading || 'carbon offset'}
            width={200}
          />
        </figure>
      )
    );
  } else if (hexagon?.content) {
    return (
      <div
        style={{
          display: 'flex',
          flexFlow: 'column nowrap',
          justifyContent: 'center',
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

function ImpactHexagons({
  carbonoffsets,
}: {
  carbonoffsets: CarbonoffsetsQueryResult;
}) {
  const [currentTab, setcurrentTab] = useState(carbonoffsets[0]?.id ?? '');
  const tabs = sortObject(carbonoffsets) as CarbonoffsetsQueryResult;

  // Inject the dynamically generated honeycomb grid CSS once.
  // hexagonGridItem() emits SCSS-style rules using `&` as a placeholder; we
  // expand `&` to the full selector and emit flat CSS (no nesting) so the
  // browser parses each rule at the top level, not as a descendant selector.
  const hexCss = useMemo(
    () =>
      `${hexagonGridItem(20, 6).replaceAll('&', '.impact-hex-list > li')}
       @media screen and (max-width: 800px) {
         .impact-hex-list > li { grid-row: auto !important; }
         ${hexagonGridItem(20, 1).replaceAll('&', '.impact-hex-list > li')}
         .impact-hex-list > li:nth-child(1) { order: 2; }
         .impact-hex-list > li:nth-child(2) { order: 3; }
         .impact-hex-list > li:nth-child(3) { order: 6; }
         .impact-hex-list > li:nth-child(4) { order: 7; }
         .impact-hex-list > li:nth-child(5) { order: 9; }
         .impact-hex-list > li:nth-child(6) { order: 10; }
         .impact-hex-list > li:nth-child(7) { order: 1; }
         .impact-hex-list > li:nth-child(8) { order: 4; }
         .impact-hex-list > li:nth-child(9) { order: 5; }
         .impact-hex-list > li:nth-child(10) { order: 8; }
       }`,
    [],
  );

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: hexCss }} />
      <nav>
        <ul className="flex flex-row flex-nowrap justify-center max-w-full w-auto mb-0 max-tablet:m-0 [&_li]:list-none max-tablet:[&_li]:mx-auto max-tablet:[&_li]:w-full max-tablet:[&_li]:flex max-tablet:[&_li]:justify-center max-tablet:[&_li]:items-center">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => setcurrentTab(tab.id)}
                className={twMerge(
                  'appearance-none border-none text-white text-base font-extrabold px-8 py-4 bg-[rgba(0,65,129,0.75)] active:border-none active:outline-0 max-tablet:p-[0.4rem] max-tablet:text-[0.69rem]',
                  currentTab === tab.id &&
                    'bg-[rgba(0,65,129,1)] border border-accent',
                )}
              >
                {tab.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex justify-center">
        {tabs
          .filter((t) => t.id === currentTab)
          .map((tab) => {
            const hexagons = sortObject(tab.hexagons ?? []) as NonNullable<
              CarbonoffsetsQueryResult[number]['hexagons']
            >;
            return (
              <ul
                key={tab.id}
                className="impact-hex-list relative py-8 px-16 w-[85vw] mx-[calc(-50vw+50%)] list-none grid grid-cols-[repeat(6,1fr_2fr)_1fr] gap-x-8 gap-y-4 [--amount:6] [--counter:1] max-tablet:[--amount:1] max-tablet:gap-x-12 max-tablet:gap-y-6"
              >
                {hexagons?.map((hexagon) => {
                  const bgColor = hexagon?.backgroundColor
                    ? hexagon?.backgroundColor.hex
                    : '#ffffff';
                  return (
                    <li
                      key={hexagon?._key ?? tab.id}
                      className="relative col-[1/span_3] row-[calc(var(--counter)+var(--counter))/span_2] h-0 pb-[90%]"
                    >
                      <div
                        style={bgColor ? { background: bgColor } : {}}
                        className="absolute left-0 top-0 h-full w-full py-8 px-[25%] [clip-path:polygon(75%_0,100%_50%,75%_100%,25%_100%,0_50%,25%_0)] text-center scale-[1.075] min-[1600px]:scale-[1.05] min-[1200px]:max-[1600px]:scale-[1.1] min-[800px]:max-[1199px]:scale-[1.12] [&[style*='_rgb(0,_65,_129)']]:max-[1600px]:px-[12%] [&[style*='_rgb(0,_65,_129)']]:max-[479px]:px-[20%] [&_>div]:h-full [&_figure]:flex [&_figure]:items-center [&_figure]:h-full [&_img]:h-auto [&_img]:w-full [&_h3]:mb-1 [&_h3]:text-base min-[901px]:max-[1600px]:[&_h3]:text-base min-[800px]:max-[900px]:[&_h3]:text-[0.5rem] max-[799px]:[&_h3]:mb-3 max-[799px]:[&_h3]:text-[5vw] [&_p]:leading-[1.4] [&_p]:text-[0.85rem] min-[1404px]:max-[1600px]:[&_p]:text-[0.7rem] min-[1275px]:max-[1403px]:[&_p]:text-[0.6rem] min-[901px]:max-[1274px]:[&_p]:text-[0.5rem] min-[800px]:max-[900px]:[&_p]:text-[0.25rem] max-[799px]:[&_p]:text-[1.4rem] max-[484px]:[&_p]:text-[0.45rem] max-[484px]:[&_p]:leading-[1.3] [&_h3]:text-white [&_h3]:font-thin [&_p]:text-white [&_p]:font-thin max-[799px]:[&_p]:font-normal"
                      >
                        {getHexagonContent(hexagon)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })}
      </div>
    </div>
  );
}

export default ImpactHexagons;
