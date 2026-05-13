import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import NationalProjects, { CaseStudy } from "./NationalProjects";
import styled from "styled-components";
import { InViewHookResponse } from "react-intersection-observer";

const StickWrapper = styled(motion.div)`
  display: none;
  scroll-snap-align: none;

  @media (min-width: 1025px) {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: white;
  }
`;

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
    if (typeof window === "undefined") return;

    const update = () => {
      const target = tableOfContentsRef.entry?.target as HTMLElement | undefined;
      if (!target) {
        setIsPastTableOfContents(false);
        return;
      }

      const headerHeight =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--header-height",
          ),
        ) || 0;
      setIsPastTableOfContents(
        window.scrollY >= target.offsetTop - headerHeight - 1,
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
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

    controls.start({ opacity: 0, y: "100%" }).then(() => {
      if (isMounted) {
        setShouldStickyBeVisible(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [controls, footerRef.inView, isPastTableOfContents]);

  return (
    <StickWrapper
      initial={{ opacity: 0, y: "100%" }}
      animate={controls}
      transition={{ duration: 0.5 }}
    >
      {shouldStickyBeVisible && <NationalProjects caseStudies={caseStudies} />}
    </StickWrapper>
  );
}
