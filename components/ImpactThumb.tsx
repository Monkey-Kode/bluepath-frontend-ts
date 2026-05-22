'use client';

import { Dispatch, SetStateAction, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import SanityImage from '@/components/SanityImage';
import type { ImpactItemsQueryResult } from '@/sanity.types';

const BLUE_BOX_CLASS = twMerge(
  // Foundation
  'appearance-none cursor-pointer rounded-lg p-4 mx-auto opacity-50 transition-opacity duration-[400ms] ease-out',
  // Color/border (.btn-active parent override)
  'bg-blue-soft border border-white',
  // Children alignment
  '[&_*]:text-white [&_*]:text-center [&_*]:uppercase [&_*]:pointer-events-none',
  '[&_p]:text-[0.55rem] [&_p]:mb-0',
  '[&_h3]:text-base [&_h3]:mb-[0.4rem]',
  // Active / inactive state from parent .btn-active
  '[.btn-active_&]:opacity-100 [.btn-active_&]:border-accent',
  // Mobile column layout (when not used as a .thumb)
  'max-tablet:[&:not(.thumb)]:flex max-tablet:[&:not(.thumb)]:flex-col max-tablet:[&:not(.thumb)]:flex-nowrap max-tablet:[&:not(.thumb)]:justify-start max-tablet:[&:not(.thumb)]:items-center max-tablet:[&:not(.thumb)>*]:flex-[1_100%]',
  'max-tablet:[&_h2]:mt-3',
  'max-tablet:[&_h3]:mb-[0.3rem]',
  'max-tablet:[&_p]:mb-0 max-tablet:[&_p]:!text-[2.5vw]',
);

function ImpactThumb({
  className,
  setFirstClick,
  setActiveBtn,
  id,
  content: { image, name, id: idInfo },
  setCurrentThumb,
  currentThumb,
}: {
  className: string;
  setFirstClick: Dispatch<SetStateAction<boolean>>;
  setActiveBtn: Dispatch<SetStateAction<string>>;
  id: string;
  content: ImpactItemsQueryResult[number];
  setCurrentThumb: Dispatch<SetStateAction<string>>;
  currentThumb: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div id={id} ref={ref} className={className}>
      <button
        type="button"
        className={BLUE_BOX_CLASS}
        onClick={() => {
          setActiveBtn(currentThumb);
          setCurrentThumb(idInfo);
          setFirstClick(false);
        }}
      >
        {image?.asset?._id && (
          <SanityImage
            image={image}
            alt={`${name} icon`}
            width={50}
            className="max-tablet:min-h-[60px] max-tablet:min-w-[60px]"
          />
        )}
        <h2 className="text-base leading-[1.2] pointer-events-none">{name}</h2>
      </button>
    </div>
  );
}

export default ImpactThumb;
