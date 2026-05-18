'use client';

import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import SanityImage from '@/components/SanityImage';
import { ContactBody } from '@/components/ContactBody';
import type {
  AddressesQueryResult,
  PageBySlugQueryResult,
} from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

function Contact({
  page,
  addresses,
}: {
  page: Page;
  addresses: AddressesQueryResult;
}) {
  const {
    Heading,
    background,
    mobilebackground,
    backgroundColor,
    id,
    name,
    boxLocation,
    richcontent,
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
  const bgColor = backgroundColor?.hex ?? '#fff';
  const boxAlign = boxLocation || 'left';

  return (
    <>
      <div className={boxAlign}>
        {background?.asset?._id && (
          <SanityImage
            className="hide-for-desktop alignfull image-atop"
            image={background}
            alt="Background Image"
            width={2000}
          />
        )}
        {sectionBg ? (
          <SanityBackgroundImage
            as="section"
            id={id ?? undefined}
            image={sectionBg}
            style={{ backgroundColor: bgColor }}
            width={2000}
          >
            <ContactBody
              id={id}
              Heading={Heading}
              name={name}
              richcontent={richcontent}
              addresses={addresses}
            />
          </SanityBackgroundImage>
        ) : (
          <section id={id ?? undefined} style={{ backgroundColor: bgColor }}>
            <ContactBody
              id={id}
              Heading={Heading}
              name={name}
              richcontent={richcontent}
              addresses={addresses}
            />
          </section>
        )}
      </div>
    </>
  );
}

export default Contact;
