'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { InViewHookResponse } from 'react-intersection-observer';

import NationalProjects, { CaseStudy } from './NationalProjects';

interface StickyNationalProjectsProps {
  caseStudies: CaseStudy[];
  footerRef: InViewHookResponse;
  tableOfContentsRef: InViewHookResponse;
}

export default function StickyNationalProjects({
  caseStudies,
  footerRef,
  tableOfContentsRef,
}: StickyNationalProjectsProps) {
  const controls = useAnimation();
  const [shouldStickyBeVisible, setShouldStickyBeVisible] = useState(false);
  const [isPastTableOfContents, setIsPastTableOfContents] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const target = tableOfContentsRef.entry?.target as HTMLElement | undefined;
      if (!target) {
        setIsPastTableOfContents(false);
        return;
      }

      const headerHeight =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--header-height',
          ),
        ) || 0;
      setIsPastTableOfContents(
        window.scrollY >= target.offsetTop - headerHeight - 1,
      );
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [tableOfContentsRef.entry]);

  useEffect(() => {
    const isStickyActive = isPastTableOfContents && !footerRef.inView;
    let isMounted = true;

    if (isStickyActive) {
      setShouldStickyBeVisible(true);
      controls.start({ opacity: 1, y: 0 });
      return () => {
        isMounted = false;
      };
    }

    controls.start({ opacity: 0, y: '100%' }).then(() => {
      if (isMounted) setShouldStickyBeVisible(false);
    });

    return () => {
      isMounted = false;
    };
  }, [controls, footerRef.inView, isPastTableOfContents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={controls}
      transition={{ duration: 0.5 }}
      className="hidden snap-align-none min-[1025px]:block min-[1025px]:fixed min-[1025px]:bottom-0 min-[1025px]:left-0 min-[1025px]:right-0 min-[1025px]:z-10 min-[1025px]:bg-white"
    >
      {shouldStickyBeVisible && <NationalProjects caseStudies={caseStudies} />}
    </motion.div>
  );
}
