/**
 * The site's own origin, resolved per deploy context.
 *
 * Server-only: relies on Netlify's auto-injected `URL` / `DEPLOY_PRIME_URL` /
 * `CONTEXT` (NOT `NEXT_PUBLIC_*`, so unavailable in client bundles — only
 * call this from Server Components / route handlers, which is where it's
 * used: app/layout.tsx metadataBase + app/sitemap.ts).
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL — explicit override (rarely needed).
 *  2. production context → Netlify `URL` (the canonical prod origin).
 *  3. any other context (deploy preview / branch deploy) → `DEPLOY_PRIME_URL`
 *     (that deploy's own URL — this is what makes previews self-consistent).
 *  4. `URL` fallback, then localhost for `next dev`.
 */
export function getSiteUrl(): string {
  const strip = (u: string) => u.replace(/\/+$/, '');

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return strip(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.CONTEXT === 'production' && process.env.URL) {
    return strip(process.env.URL);
  }
  if (process.env.DEPLOY_PRIME_URL) {
    return strip(process.env.DEPLOY_PRIME_URL);
  }
  if (process.env.URL) {
    return strip(process.env.URL);
  }
  return 'http://localhost:3000';
}
