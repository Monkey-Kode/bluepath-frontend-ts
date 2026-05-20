'use client';

import { useInView } from 'react-intersection-observer';

import ContentBox from '@/components/ContentBox';
import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import SanityImage from '@/components/SanityImage';
import intersectionObserverOptions from '@/utils/intersectionObserverOptions';
import type { HomesectionsQueryResult } from '@/sanity.types';

type Section = HomesectionsQueryResult[number];

function Plain({ content }: { content: Section }) {
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
  const boxAlign = boxLocation || 'left';

  return background ? (
    <div
      className={`${boxAlign} max-tablet:block max-tablet:[&_section]:bg-blue max-tablet:[&_section]:p-0 max-tablet:[&_section]:before:!bg-none max-tablet:[&_section]:after:!bg-none`}
    >
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
        className={`plain ${name ?? ''}`}
        image={background}
        style={{ backgroundColor: bgColor }}
        width={2000}
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
      className={name ?? 'section'}
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
