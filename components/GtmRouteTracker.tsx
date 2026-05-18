'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Next's App Router does not emit pageview events on client-side navigation.
 * `gatsby-plugin-google-tagmanager` pushed `{ event: 'gatsby-route-change' }`
 * on every route change — replicate that exact event name so the existing
 * GTM container's triggers fire identically (FR-006).
 */
function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    // The initial pageview is handled by the GTM container on gtm.js load;
    // only emit the route-change event on subsequent client navigations.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'gatsby-route-change' });
  }, [pathname, searchParams]);

  return null;
}

export default function GtmRouteTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
