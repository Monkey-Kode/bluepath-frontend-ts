import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    // Matches `sanity dev`: use styled-components' fast CSS-rule insertion in
    // both dev and production (it is otherwise disabled in dev).
    SC_DISABLE_SPEEDY: 'false',
  },
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: [new URL('https://cdn.sanity.io/**')],
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
