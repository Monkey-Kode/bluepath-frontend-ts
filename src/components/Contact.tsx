import { getImage, GatsbyImage } from 'gatsby-plugin-image';
import React from 'react';
// import styled from 'styled-components';
import StyleBackgroundImage from '../styles/StyleBackgroundImage';
import { ContactBody } from './ContactBody';
import { convertToBgImage } from 'gbimage-bridge';

function Contact({ sanityPage }: { sanityPage: Queries.SanityPage }) {
  const {
    Heading,
    background,
    mobilebackground,
    backgroundColor,
    id,
    name,
    boxLocation,
    richcontent,
  } = sanityPage;

  let sectionBg = background;
  if (typeof window !== 'undefined') {
    let mql = window.matchMedia('(max-width: 600px)');
    if (!mql.matches && background) {
      sectionBg = background;
    } else if (mql.matches && mobilebackground) {
      sectionBg = mobilebackground;
    } else {
      sectionBg = background;
    }
  }
  // const { remoteRichContent } = useRichPageData(_id);
  const bgColor = backgroundColor?.hex ?? '#fff';

  let boxAlign = 'left';
  if (boxLocation) {
    boxAlign = boxLocation;
  }
  const image = sectionBg?.asset?.gatsbyImageData
    ? getImage(sectionBg?.asset?.gatsbyImageData)
    : null;
  const bgImage = image ? convertToBgImage(image) : null;

  return (
    <>
      <div className={boxAlign}>
        {background?.asset?.gatsbyImageData && (
          <GatsbyImage
            className="hide-for-desktop alignfull image-atop"
            image={background?.asset?.gatsbyImageData}
            alt="Background Image"
          />
        )}
        {sectionBg ? (
          <StyleBackgroundImage
            id={id ?? undefined}
            Tag="section"
            {...bgImage}
            backgroundColor={bgColor}
          >
            <ContactBody
              id={id}
              Heading={Heading}
              name={name}
              richcontent={richcontent}
            />
          </StyleBackgroundImage>
        ) : (
          <section id={id ?? undefined} style={{ backgroundColor: bgColor }}>
            <ContactBody
              id={id}
              Heading={Heading}
              name={name}
              richcontent={richcontent}
            />
          </section>
        )}
      </div>
    </>
  );
}

export default Contact;
