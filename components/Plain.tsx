'use client';

import { useInView } from 'react-intersection-observer';
import { twMerge } from 'tailwind-merge';

import ContentBox from '@/components/ContentBox';
import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import SanityImage from '@/components/SanityImage';
import boxAlignClass from '@/utils/boxAlignClass';
import intersectionObserverOptions from '@/utils/intersectionObserverOptions';
import type { HomesectionsQueryResult } from '@/sanity.types';

type Section = HomesectionsQueryResult[number];

/**
 * Full-bleed home-box layout — the former global `section:not([aria-label])`
 * rule, now passed in only to home sections (via `fullHeight`). Off-home these
 * sections are normal-flow. (SanityBackgroundImage already supplies the flex +
 * `h-screen`; this adds the full-viewport width, padding, and child sizing.)
 */
const BOX_SECTION =
  'flex w-screen items-center justify-start p-[2vw] [&>div]:w-full max-tablet:block max-tablet:p-0';

function Plain({
  content,
  fullHeight = false,
}: {
  content: Section;
  fullHeight?: boolean;
}) {
  const {
    id,
    anchorId,
    name,
    sectionContent,
    sectionContentCTAjumpId,
    sectionContentCTApageLink,
    sectionContentCTAtext,
    sectionHeadingPosition,
    background,
    backgroundColor,
    sectionHeading,
    boxLocation,
    hidetitle,
  } = content;
  const { ref } = useInView(intersectionObserverOptions);

  const bgColor = backgroundColor?.hex ?? '#fff';
  const boxAlign = boxAlignClass(boxLocation);

  return background ? (
    <div className={`${boxAlign} max-tablet:block`}>
      {background?.asset?._id && (
        <SanityImage
          alt="Background scenery"
          className={`hide-for-desktop ${anchorId || 'section'}`}
          image={background}
          style={{ marginBottom: '0', display: 'block' }}
          width={2000}
        />
      )}
      <SanityBackgroundImage
        as="section"
        id={anchorId ?? undefined}
        className={twMerge(
          `plain ${name ?? ''} max-tablet:bg-blue max-tablet:p-0 max-tablet:before:!bg-none max-tablet:after:!bg-none`,
          fullHeight && BOX_SECTION,
        )}
        image={background}
        style={{ backgroundColor: bgColor }}
        width={2000}
        fullHeight={fullHeight}
      >
        <div className={`${boxAlign} ${name ?? ''}`}>
          <ContentBox
            hidetitle={hidetitle}
            sectionContent={sectionContent}
            sectionHeading={sectionHeading}
            sectionContentCTAjumpId={sectionContentCTAjumpId}
            sectionContentCTApageLink={sectionContentCTApageLink}
            sectionHeadingPosition={sectionHeadingPosition}
            sectionContentCTAtext={sectionContentCTAtext}
          />
        </div>
      </SanityBackgroundImage>
    </div>
  ) : (
    <section
      className={twMerge(name ?? 'section', fullHeight && BOX_SECTION)}
      ref={ref}
      id={anchorId ?? `section-${id}`}
      style={{ backgroundColor: String(bgColor) }}
    >
      <div className={boxAlign}>
        <ContentBox
          hidetitle={hidetitle}
          sectionContent={sectionContent}
          sectionHeading={sectionHeading}
          sectionContentCTAjumpId={sectionContentCTAjumpId}
          sectionContentCTApageLink={sectionContentCTApageLink}
          sectionHeadingPosition={sectionHeadingPosition}
          sectionContentCTAtext={sectionContentCTAtext}
        />
      </div>
    </section>
  );
}

export default Plain;
