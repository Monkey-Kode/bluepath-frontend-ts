'use client';

import ContentBox from '@/components/ContentBox';
import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import SanityImage from '@/components/SanityImage';
import type { PageBySlugQueryResult } from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

const IndividualPageContent = ({ page }: { page: Page }) => {
  const {
    background,
    backgroundColor,
    mobilebackground,
    boxLocation,
    id,
    hidetitle,
    content,
    Heading,
    sectionContentCTAjumpId,
    sectionContentCTApageLink,
    sectionHeadingPosition,
    sectionContentCTAtext,
  } = page;

  let sectionBg = background;
  if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(max-width: 600px)');
    if (!mql.matches && background) {
      sectionBg = background;
    } else if (mql.matches && mobilebackground) {
      sectionBg = mobilebackground;
    } else {
      sectionBg = background;
    }
  }

  const bgColor = backgroundColor?.hex ?? 'var(--color-blue)';
  const boxAlign = boxLocation || 'left';

  if (background) {
    return (
      <div
        className={`${boxAlign} max-tablet:mt-[119px] max-tablet:block max-tablet:[&_section]:bg-blue max-tablet:[&_section]:p-0 max-tablet:[&_section]:before:!bg-none max-tablet:[&_section]:after:!bg-none`}
      >
        {background?.asset?._id && (
          <SanityImage
            alt="Background scenery"
            className={`hide-for-desktop ${id || 'section'}`}
            image={background}
            style={{ marginBottom: '0', display: 'block' }}
            width={2000}
          />
        )}
        <SanityBackgroundImage
          as="section"
          id={id ?? undefined}
          className="individual-page"
          image={sectionBg}
          style={{ backgroundColor: bgColor }}
          width={2000}
        >
          <ContentBox
            hidetitle={hidetitle}
            sectionContent={content}
            sectionHeading={Heading}
            sectionContentCTAjumpId={sectionContentCTAjumpId}
            sectionContentCTApageLink={sectionContentCTApageLink}
            sectionHeadingPosition={sectionHeadingPosition}
            sectionContentCTAtext={sectionContentCTAtext}
          />
        </SanityBackgroundImage>
      </div>
    );
  }
  return <section id={id ?? undefined} />;
};

export default IndividualPageContent;
