import Header from '@/components/Header';
import { sanityFetch } from '@/sanity/lib/live';
import { navigationQuery, settingsQuery } from '@/sanity/lib/queries';

/** Server wrapper: fetches site settings + navigation, renders the client Header. */
export default async function SiteHeader() {
  const [{ data: settings }, { data: navigation }] = await Promise.all([
    sanityFetch({ query: settingsQuery }),
    sanityFetch({ query: navigationQuery }),
  ]);

  return <Header settings={settings} navigation={navigation} />;
}
