import Footer from '@/components/Footer';
import { sanityFetch } from '@/sanity/lib/live';
import {
  addressesQuery,
  navigationQuery,
  settingsQuery,
} from '@/sanity/lib/queries';

/** Server wrapper: fetches addresses + navigation + settings, renders the client Footer. */
export default async function SiteFooter() {
  const [{ data: addresses }, { data: navigation }, { data: settings }] =
    await Promise.all([
      sanityFetch({ query: addressesQuery }),
      sanityFetch({ query: navigationQuery }),
      sanityFetch({ query: settingsQuery }),
    ]);

  return (
    <Footer addresses={addresses} navigation={navigation} settings={settings} />
  );
}
