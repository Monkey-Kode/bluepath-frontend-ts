import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import NationalProjects, { CaseStudy } from "./NationalProjects";
import styled from "styled-components";
import { InViewHookResponse } from "react-intersection-observer";

const StickWrapper = styled(motion.div)`
  display: none;
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      const sectionStartY =
        tableOfContentsRef.entry?.boundingClientRect.top ?? 0;
      const currentScrollY = window.scrollY;

      if (footerRef.inView) {
        controls.start({ opacity: 0, y: "100%" });
        setShouldStickyBeVisible(false);
      } else if (currentScrollY >= sectionStartY) {
        controls.start({ opacity: 1, y: 0 });
        setShouldStickyBeVisible(true);
      } else {
        controls.start({ opacity: 0, y: "100%" });
        setShouldStickyBeVisible(false);
      }
    };

    apply();
    window.addEventListener("scroll", apply, { passive: true });
    return () => {
      window.removeEventListener("scroll", apply);
    };
  }, [footerRef.inView, tableOfContentsRef.entry, controls]);

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
