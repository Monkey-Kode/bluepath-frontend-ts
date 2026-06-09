'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

import scrollTo from '@/lib/scrollTo';
import intersectionObserverOptions from '@/utils/intersectionObserverOptions';
import splitByNewLines from '@/utils/splitByNewLines';
import useIsMobile from '@/utils/useIsMobile';
import type { HomesectionsQueryResult } from '@/sanity.types';

type Section = HomesectionsQueryResult[number];

const containerVariants = (headerHeight: number, contentHeight: number) => ({
  hidden: { height: headerHeight },
  visible: { height: headerHeight + contentHeight + 32 },
});

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const dividerVariants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1 },
};

function ContentBox({
  sectionHeading,
  sectionContent,
  sectionContentCTAjumpId,
  sectionContentCTApageLink,
  sectionContentCTAtext,
  sectionHeadingPosition,
  hidetitle,
}: {
  sectionHeading: Section['sectionHeading'];
  sectionContent: Section['sectionContent'];
  sectionContentCTAjumpId: Section['sectionContentCTAjumpId'];
  sectionContentCTApageLink: Section['sectionContentCTApageLink'];
  sectionContentCTAtext: Section['sectionContentCTAtext'];
  sectionHeadingPosition: Section['sectionHeadingPosition'];
  hidetitle: Section['hidetitle'];
}) {
  const { ref, inView } = useInView(intersectionObserverOptions);
  const isMobile = useIsMobile();

  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [headerHeight, setHeaderHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.getBoundingClientRect().height);
    }
    if (contentRef.current) {
      setContentHeight(contentRef.current.getBoundingClientRect().height);
    }
  }, []);

  useEffect(() => {
    if (inView && !hasAnimated) setHasAnimated(true);
  }, [inView, hasAnimated]);

  let ctaLink = '';
  if (sectionContentCTAjumpId) ctaLink = `#${sectionContentCTAjumpId}`;
  else if (sectionContentCTApageLink)
    ctaLink = `/${sectionContentCTApageLink?.slug ?? ''}`;

  const headingContent = sectionHeading?.toString().split(' ') ?? [];
  const heading = headingContent.length > 0 ? headingContent[0] : null;
  const subheading =
    headingContent.length > 1 ? headingContent.slice(1).join(' ') : null;

  return (
    <div ref={ref} className={twMerge(inView ? 'active' : 'inactive')}>
      <motion.div
        className={twMerge(
          'box max-w-[38.5rem] overflow-hidden p-0',
          sectionHeading,
        )}
        initial={isMobile ? 'visible' : 'hidden'}
        animate={hasAnimated ? 'visible' : 'hidden'}
        variants={containerVariants(headerHeight, contentHeight)}
        transition={isMobile ? { duration: 0 } : { duration: 1, delay: 0.5 }}
      >
        <div className="box-inner bg-white h-full px-8 py-4 max-[1024px]:px-6">
          <div ref={headerRef}>
            {!hidetitle && (
              <motion.h2
                className={twMerge(
                  'm-0 max-w-full border-none pb-2 pt-6 font-extrabold text-7xl max-tablet:text-center max-tablet:text-[1.75rem] leading-none',
                  sectionHeadingPosition && 'hide-for-desktop',
                )}
                initial={isMobile ? 'visible' : 'hidden'}
                animate={hasAnimated ? 'visible' : 'hidden'}
                variants={fadeIn}
                transition={isMobile ? { duration: 0 } : { duration: 0.5 }}
              >
                {heading}
              </motion.h2>
            )}
            {!hidetitle && (
              <motion.h3
                className={twMerge(
                  'm-0 pb-6 text-center lowercase text-[calc(1.875rem+0.5vw)] max-tablet:text-[1.5rem] leading-none font-medium',
                  sectionHeadingPosition && 'hide-for-desktop',
                )}
                initial={isMobile ? 'visible' : 'hidden'}
                animate={hasAnimated ? 'visible' : 'hidden'}
                variants={fadeIn}
                transition={
                  isMobile ? { duration: 0 } : { duration: 0.5, delay: 0.5 }
                }
              >
                {subheading}
              </motion.h3>
            )}
          </div>
          <motion.hr
            className="my-0 origin-left border-b-[var(--border-bottom)]"
            initial={isMobile ? 'visible' : 'hidden'}
            animate={hasAnimated ? 'visible' : 'hidden'}
            variants={dividerVariants}
            transition={
              isMobile ? { duration: 0 } : { duration: 0.5, delay: 1 }
            }
          />
          <div ref={contentRef} className="p-4">
            <motion.div
              className="prose"
              initial={isMobile ? 'visible' : 'hidden'}
              animate={hasAnimated ? 'visible' : 'hidden'}
              variants={fadeIn}
              transition={
                isMobile ? { duration: 0 } : { duration: 0.5, delay: 1.5 }
              }
            >
              <p>{splitByNewLines(String(sectionContent))}</p>
              {ctaLink && sectionContentCTAtext && sectionContentCTAjumpId && (
                <a
                  className="block text-center"
                  href={ctaLink}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(ctaLink);
                  }}
                >
                  {sectionContentCTAtext}
                </a>
              )}
              {ctaLink && sectionContentCTAtext && !sectionContentCTAjumpId && (
                <Link className="block text-center" href={ctaLink}>
                  {sectionContentCTAtext}
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ContentBox;
