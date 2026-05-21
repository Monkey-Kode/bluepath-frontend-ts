'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';
import classNames from 'classnames';

import scrollTo from '@/lib/scrollTo';
import intersectionObserverOptions from '@/utils/intersectionObserverOptions';
import splitByNewLines from '@/utils/splitByNewLines';
import useIsMobile from '@/utils/useIsMobile';
import type { PageBySlugQueryResult } from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

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
    sectionHeading: Page['Heading'];
    sectionContent: Page['content'];
    sectionContentCTAjumpId: Page['sectionContentCTAjumpId'];
    sectionContentCTApageLink: Page['sectionContentCTApageLink'];
    sectionContentCTAtext: Page['sectionContentCTAtext'];
    sectionHeadingPosition: Page['sectionHeadingPosition'];
    hidetitle: Page['hidetitle'];
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
        <div
            ref={ref}
            className={classNames({ active: inView, inactive: !inView })}
        >
            <motion.div
                className={classNames(
                    'box max-w-[38.5rem] overflow-hidden p-0',
                    sectionHeading,
                )}
                initial={isMobile ? 'visible' : 'hidden'}
                animate={hasAnimated ? 'visible' : 'hidden'}
                variants={containerVariants(headerHeight, contentHeight)}
                transition={isMobile ? { duration: 0 } : { duration: 1, delay: 0.5 }}
            >
                <div className="box-inner bg-white h-full px-8 py-4 max-[1024px]:px-6">
                    <div
                        ref={headerRef}
                        className="[&_h2]:m-0 [&_h2]:max-w-full [&_h2]:border-none [&_h2]:pb-2 [&_h2]:pt-6 [&_h2]:leading-none [&_h2]:text-4xl max-tablet:[&_h2]:text-center max-tablet:[&_h2]:text-[1.75rem] [&_h3]:m-0 [&_h3]:pb-6 [&_h3]:text-center [&_h3]:italic [&_h3]:lowercase [&_h3]:text-[calc(1.875rem+0.5vw)] max-tablet:[&_h3]:text-[1.5rem] [&_h3]:leading-none"
                    >
                        {!hidetitle && (
                            <motion.h2
                                className={sectionHeadingPosition ? 'hide-for-desktop' : ''}
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
                                className={sectionHeadingPosition ? 'hide-for-desktop' : ''}
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
                    <div
                        ref={contentRef}
                        className="p-4 [&_a]:block [&_a]:text-center"
                    >
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
                                <Link href={ctaLink}>{sectionContentCTAtext}</Link>
                            )}
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default ContentBox;
