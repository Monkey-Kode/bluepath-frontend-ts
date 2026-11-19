import ArticleArchive, { type ArchiveItem } from '@/components/ArticleArchive';
import { archiveImage } from '@/lib/articles';
import { caseStudyLabel, caseStudyTitle } from '@/lib/caseStudies';
import type { AllCaseStudiesQueryResult } from '@/sanity.types';

/** The case study archive. A case study needs a slug and a published date to show. */
export default function CaseStudyArchive({
  caseStudies,
}: {
  caseStudies: AllCaseStudiesQueryResult;
}) {
  const items: ArchiveItem[] = caseStudies.flatMap((c) =>
    c.slug && c.publishedAt
      ? [
          {
            kind: 'caseStudy',
            id: c._id,
            slug: c.slug,
            title: caseStudyTitle(c),
            subhead: c.subhead ?? null,
            label: caseStudyLabel(c.project),
            excerpt: c.excerpt ?? null,
            date: c.publishedAt,
            image: archiveImage(c.featuredImage, c.heroImage),
          },
        ]
      : [],
  );

  return (
    <ArticleArchive
      heading="Case Studies"
      items={items}
      emptyMessage="No case studies yet."
    />
  );
}
