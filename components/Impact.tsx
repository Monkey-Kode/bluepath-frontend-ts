import type {
  PageBySlugQueryResult,
  ImpactPageContentQueryResult,
} from '@/sanity.types';
import CarbonOffsets from './CarbonOffsets';
import EnvironmentalImpact from './EnvironmentalImpact';

/**
 * Impact page sections, served from the single `impactPageContent` singleton.
 * Renders transparently over the site's white background (FR-033). The page
 * `Heading` titles the Environmental Impact section; the Carbon Offsets title
 * is fixed in its component. Both children render nothing when their array is
 * absent, so a missing/empty singleton degrades gracefully (NFR-006).
 *
 * The two child sections are normal-flow (each carries an `aria-label`, which
 * also names them as landmarks); `header-offset` here clears the fixed header.
 */
function Impact({
  page,
  content,
}: {
  page: NonNullable<PageBySlugQueryResult>;
  content: ImpactPageContentQueryResult;
}) {
  const tabs = content?.carbonOffsetTabs ?? [];
  const categories = content?.environmentalCategories ?? [];

  return (
    <div id={page.id ?? undefined} className="header-offset w-full bg-transparent">
      <CarbonOffsets tabs={tabs} />
      <EnvironmentalImpact categories={categories} heading={page.Heading} />
    </div>
  );
}

export default Impact;
