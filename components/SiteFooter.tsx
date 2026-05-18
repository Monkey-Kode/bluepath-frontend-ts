import Footer from '@/components/Footer';
import { sanityFetch } from '@/sanity/lib/live';
import { addressesQuery, navigationQuery } from '@/sanity/lib/queries';

/** Server wrapper: fetches addresses + navigation, renders the client Footer. */
export default async function SiteFooter() {
  const [{ data: addresses }, { data: navigation }] = await Promise.all([
    sanityFetch({ query: addressesQuery }),
    sanityFetch({ query: navigationQuery }),
  ]);

  return <Footer addresses={addresses} navigation={navigation} />;
}
