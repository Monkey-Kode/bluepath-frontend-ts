import HomeView from '@/components/HomeView';
import { sanityFetch } from '@/sanity/lib/live';
import {
  addressesQuery,
  carouselQuery,
  casestudiesQuery,
  homesectionsQuery,
  homevideoQuery,
  navigationQuery,
  settingsQuery,
  teamQuery,
} from '@/sanity/lib/queries';

export default async function HomePage() {
  const [
    { data: settings },
    { data: navigation },
    { data: addresses },
    { data: sections },
    { data: caseStudies },
    { data: videos },
    { data: slides },
    { data: team },
  ] = await Promise.all([
    sanityFetch({ query: settingsQuery }),
    sanityFetch({ query: navigationQuery }),
    sanityFetch({ query: addressesQuery }),
    sanityFetch({ query: homesectionsQuery }),
    sanityFetch({ query: casestudiesQuery }),
    sanityFetch({ query: homevideoQuery }),
    sanityFetch({ query: carouselQuery }),
    sanityFetch({ query: teamQuery }),
  ]);

  return (
    <HomeView
      settings={settings}
      navigation={navigation}
      addresses={addresses}
      sections={sections}
      caseStudies={caseStudies}
      videos={videos}
      slides={slides}
      team={team}
    />
  );
}
