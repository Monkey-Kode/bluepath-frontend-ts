'use client';

import styled from 'styled-components';

import ContentBox from '@/components/ContentBox';
import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import SanityImage from '@/components/SanityImage';
import type { PageBySlugQueryResult } from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

const StyledContent = styled.div`
  @media only screen and (max-width: 800px) {
    display: block;
    margin-top: 119px;
    section {
      background-color: var(--blue);
      padding: 0;
      &::after,
      &::before {
        background: none !important;
      }
    }
  }
`;

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

  const bgColor = backgroundColor?.hex ?? 'var(--blue)';
  const boxAlign = boxLocation || 'left';

  if (background) {
    return (
      <StyledContent className={boxAlign}>
        {background?.asset?._id && (
          <SanityImage
            alt="Background scenery"
            className={`hide-for-desktop ${id || 'section'}`}
            image={background}
            style={{ marginBottom: '0', display: 'block' }}
            width={2000}
          />
        )}
        <section
          id={id ?? undefined}
          className="individual-page"
          style={{ backgroundColor: bgColor }}
        >
          <SanityBackgroundImage image={sectionBg} width={2000}>
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
        </section>
      </StyledContent>
    );
  }
  return <section id={id ?? undefined} />;
};

export default IndividualPageContent;
