'use client';

import {
  type InViewHookResponse,
  useInView,
} from 'react-intersection-observer';

import HomeHero from '@/components/HomeHero';
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

  // The Video + TOF sections are choreographed together as the hero scroll
  // scene (HomeHero); render them there and skip them in the normal flow.
  const videoSection = orderedSections.find(
    (s) => s?.contentType?.name === 'Video',
  );
  const tofSection = orderedSections.find(
    (s) => s?.contentType?.name === 'TOF',
  );
  const restSections = orderedSections.filter(
    (s) =>
      s?.contentType?.name !== 'Video' && s?.contentType?.name !== 'TOF',
  );

  return (
    <main>
      {videoSection && tofSection && (
        <HomeHero
          videoSection={videoSection}
          tofSection={tofSection}
          videos={videos}
          tableOfContentsRef={tableOfContentsRef}
        />
      )}
      {restSections.map((content) =>
        content ? (
          <PageContent
            key={content.id}
            content={content}
            caseStudies={orderedCaseStudies}
            videos={videos}
            slides={slides}
            team={team}
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
