import type { Metadata } from 'next';

import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import TeamView from '@/components/TeamView';
import { sanityFetch } from '@/sanity/lib/live';
import { teamQuery } from '@/sanity/lib/queries';

export const metadata: Metadata = {
  title: 'Leadership',
  description: 'The leadership team behind BluePath Finance.',
};

export default async function LeadershipPage() {
  const { data: team } = await sanityFetch({ query: teamQuery });

  return (
    <div>
      <SiteHeader />
      <TeamView team={team} />
      <SiteFooter />
    </div>
  );
}
