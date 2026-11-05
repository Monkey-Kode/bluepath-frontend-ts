import 'server-only';

import { createClient, type SanityClient } from 'next-sanity';

import { apiVersion, dataset, projectId } from '@/sanity/lib/api';

/**
 * The Sanity client that writes map projects. It holds the write token, so only server code may
 * import it (NFR-007).
 *
 * Only Netlify's production deploy may write to the `production` dataset. Local runs and other
 * deploys write to `development`. Netlify sets `CONTEXT` only during the build, so
 * `next.config.ts` bakes the build's value into the server code.
 *
 * It reads the token on each call, so a build without the token still succeeds.
 */
export function writeClient(): SanityClient {
  const context = process.env.CONTEXT;
  if (dataset === 'production' && context !== 'production') {
    throw new Error(
      `Refusing to write to the production dataset outside Netlify's production deploy (CONTEXT is ${JSON.stringify(context ?? '')}).`,
    );
  }

  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    throw new Error('Missing SANITY_API_WRITE_TOKEN');
  }

  return createClient({ projectId, dataset, apiVersion, token, useCdn: false });
}
