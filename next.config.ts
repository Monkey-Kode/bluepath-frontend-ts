import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gatsby used `trailingSlash: 'always'` — preserve every existing URL.
  trailingSlash: true,
  // Enables React's <ViewTransition> integration so route navigations
  // (e.g. /leadership → /leadership/[slug]) wrap in the browser View Transitions API.
  experimental: {
    viewTransition: true,
  },
  // Allow the proxied remote host (office.monkeykode.com → localhost:3000)
  // to reach dev-only assets/HMR (Next 16 blocks cross-origin dev by default).
  allowedDevOrigins: ['office.monkeykode.com'],
  async redirects() {
    // Ported from gatsby-node.ts (createRedirect, isPermanent → Netlify 301)
    // and netlify.toml ([[redirects]] status=301). Use statusCode:301 NOT
    // permanent:true (which would emit 308 — a gratuitous behavior change).
    return [
      { source: '/events', destination: '/news-and-events', statusCode: 301 },
      { source: '/event/:slug', destination: '/events/:slug', statusCode: 301 },
      // Contact page slug was renamed connect → contact-us.
      { source: '/connect', destination: '/contact-us', statusCode: 301 },
      {
        source: '/assessment-request',
        destination: '/contact-us',
        statusCode: 301,
      },
      {
        source: '/assessment-request/:path*',
        destination: '/contact-us',
        statusCode: 301,
      },
    ];
  },
  images: {
    remotePatterns: [
      new URL('https://cdn.sanity.io/**'),
      new URL('https://office.monkeykode.com/**'),
    ],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
