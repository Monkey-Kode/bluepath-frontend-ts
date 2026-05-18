'use client';

import {
  type InViewHookResponse,
  useInView,
} from 'react-intersection-observer';

import PageContent from '@/components/PageContent';
import StickyNationalProjects from '@/components/StickyNationalProjects';
import sortObject from '@/utils/sortObject';
import type {
  CarouselQueryResult,
  CasestudiesQueryResult,
  HomesectionsQueryResult,
  HomevideoQueryResult,
  TeamQueryResult,
} from '@/sanity.types';

interface HomeMainProps {
  footerRef: InViewHookResponse;
  sections: HomesectionsQueryResult;
  caseStudies: CasestudiesQueryResult;
  videos: HomevideoQueryResult;
  slides: CarouselQueryResult;
  team: TeamQueryResult;
}

function HomeMain({
  footerRef,
  sections,
  caseStudies,
  videos,
  slides,
  team,
}: HomeMainProps) {
  const tableOfContentsRef = useInView({ threshold: 0.25 });

  const orderedSections = sortObject(sections);
  const orderedCaseStudies = sortObject(caseStudies);

  return (
    <main>
      {orderedSections.map((content) =>
        content ? (
          <PageContent
            key={content.id}
            content={content}
            caseStudies={orderedCaseStudies}
            videos={videos}
            slides={slides}
            team={team}
            tableOfContentsRef={
              content?.contentType?.name === 'TOF'
                ? tableOfContentsRef
                : undefined
            }
          />
        ) : null,
      )}
      <StickyNationalProjects
        caseStudies={orderedCaseStudies}
        footerRef={footerRef}
        tableOfContentsRef={tableOfContentsRef}
      />
    </main>
  );
}

export default HomeMain;
