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

    const update = () => {
      // Pull the live rect from the observed TOF section. We need a real-time
      // measurement (not the cached intersection entry) because intersection
      // entries only update on threshold crossings, not on every scroll.
      const target = tableOfContentsRef.entry?.target;
      const rect = target?.getBoundingClientRect();
      const scrolledPast = rect ? rect.bottom <= 0 : false;

      if (footerRef.inView) {
        // Footer in view — hide so it doesn't overlap.
        controls.start({ opacity: 0, y: "100%" });
        setShouldStickyBeVisible(false);
      } else if (scrolledPast) {
        // TOF section (and its embedded NationalProjects) has fully scrolled
        // out of viewport — animate the sticky copy up.
        controls.start({ opacity: 1, y: 0 });
        setShouldStickyBeVisible(true);
      } else {
        // Either the section is still in view (embedded copy is visible) or
        // we haven't reached it yet — keep the sticky tucked offscreen.
        controls.start({ opacity: 0, y: "100%" });
        setShouldStickyBeVisible(false);
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [footerRef.inView, tableOfContentsRef.entry, controls]);

  return (
    <StickWrapper
      initial={{ opacity: 0, y: "100%" }}
      animate={controls}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {shouldStickyBeVisible && <NationalProjects caseStudies={caseStudies} />}
    </StickWrapper>
  );
}
