import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gatsby used `trailingSlash: 'always'` — preserve every existing URL.
  trailingSlash: true,
  async redirects() {
    // Ported from gatsby-node.ts (createRedirect, isPermanent → Netlify 301)
    // and netlify.toml ([[redirects]] status=301). Use statusCode:301 NOT
    // permanent:true (which would emit 308 — a gratuitous behavior change).
    return [
      { source: '/events', destination: '/news-and-events', statusCode: 301 },
      { source: '/event/:slug', destination: '/events/:slug', statusCode: 301 },
      { source: '/assessment-request', destination: '/connect', statusCode: 301 },
      {
        source: '/assessment-request/:path*',
        destination: '/connect',
        statusCode: 301,
      },
    ];
  },
  env: {
    // Matches `sanity dev`: use styled-components' fast CSS-rule insertion in
    // both dev and production (it is otherwise disabled in dev).
    SC_DISABLE_SPEEDY: 'false',
  },
  compiler: {
    styledComponents: true,
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
