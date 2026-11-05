import type { Metadata } from 'next';

import CaseStudyArchive from '@/components/CaseStudyArchive';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { sanityFetch } from '@/sanity/lib/live';
import { allCaseStudiesQuery } from '@/sanity/lib/queries';

export const metadata: Metadata = {
  title: 'Case Studies',
  description:
    'How BluePath Finance funds energy projects, told one project at a time.',
};

export default async function CaseStudiesPage() {
  const { data: caseStudies } = await sanityFetch({
    query: allCaseStudiesQuery,
  });

  return (
    <div>
      <SiteHeader />
      <CaseStudyArchive caseStudies={caseStudies} />
      <SiteFooter />
    </div>
  );
}
