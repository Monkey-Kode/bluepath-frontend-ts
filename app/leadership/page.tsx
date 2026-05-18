import type { Metadata } from 'next';

import LeadershipView from '@/components/LeadershipView';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { sanityFetch } from '@/sanity/lib/live';
import { teamQuery } from '@/sanity/lib/queries';

export const metadata: Metadata = {
  title: 'Leadership',
  description: 'The team behind BluePath Finance.',
};

export default async function LeadershipPage() {
  const { data: team } = await sanityFetch({ query: teamQuery });

  return (
    <div>
      <SiteHeader />
      <LeadershipView team={team} />
      <SiteFooter />
    </div>
  );
}
