'use client';

import type { InViewHookResponse } from 'react-intersection-observer';

import Carousel from '@/components/Carousel';
import Plain from '@/components/Plain';
import Projects from '@/components/Projects';
import TableOfContents from '@/components/TableOfContents';
import Team from '@/components/Team';
import Video from '@/components/Video';
import type {
  CarouselQueryResult,
  CasestudiesQueryResult,
  HomesectionsQueryResult,
  HomevideoQueryResult,
  PageBySlugQueryResult,
  TeamQueryResult,
} from '@/sanity.types';

type Section = HomesectionsQueryResult[number];

function PageContent({
  content,
  caseStudies,
  videos,
  slides,
  team,
  tableOfContentsRef,
}: {
  content: Section;
  caseStudies: CasestudiesQueryResult;
  videos: HomevideoQueryResult;
  slides: CarouselQueryResult;
  team: TeamQueryResult;
  tableOfContentsRef?: InViewHookResponse;
}) {
  const contentType = content?.contentType?.name;

  if (contentType === 'Video') {
    return <Video key={content.id} content={content} videos={videos} />;
  } else if (contentType === 'Carousel') {
    return <Carousel key={content.id} content={content} slides={slides} />;
  } else if (contentType === 'Projects') {
    return (
      <Projects
        key={content.id}
        page={content as unknown as NonNullable<PageBySlugQueryResult>}
        casestudies={caseStudies}
      />
    );
  } else if (contentType === 'Team') {
    return (
      <Team
        key={content.id}
        page={content as unknown as NonNullable<PageBySlugQueryResult>}
        team={team}
      />
    );
  } else if (contentType === 'TOF') {
    return tableOfContentsRef?.ref ? (
      <TableOfContents
        key={content.id}
        content={content}
        tableOfContentsRef={tableOfContentsRef}
      />
    ) : null;
  } else {
    return <Plain key={content.id} content={content} />;
  }
}

export default PageContent;
