import type { MetadataRoute } from 'next';

import { sanityFetch } from '@/sanity/lib/live';
import { sitemapQuery, teamSlugsQuery } from '@/sanity/lib/queries';
import { getSiteUrl } from '@/lib/siteUrl';

const BASE = getSiteUrl();

// Slugs owned by hand-built static routes (mirrors gatsby-node STATIC_PAGE_SLUGS).
const STATIC_PAGE_SLUGS = new Set(['leadership', 'news-and-events']);

const STATIC_ROUTES = ['', 'leadership', 'news-and-events', 'thankyou'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data }, { data: teamSlugs }] = await Promise.all([
    sanityFetch({
      query: sitemapQuery,
      perspective: 'published',
      stega: false,
    }),
    sanityFetch({
      query: teamSlugsQuery,
      perspective: 'published',
      stega: false,
    }),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${BASE}/${path ? `${path}/` : ''}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));

  for (const doc of data ?? []) {
    if (!doc.slug) continue;
    let path: string;
    switch (doc._type) {
      case 'event':
        path = `events/${doc.slug}`;
        break;
      case 'news':
        path = `news/${doc.slug}`;
        break;
      case 'page':
        if (STATIC_PAGE_SLUGS.has(doc.slug)) continue;
        path = doc.slug;
        break;
      default:
        continue;
    }
    entries.push({
      url: `${BASE}/${path}/`,
      lastModified: doc._updatedAt ? new Date(doc._updatedAt) : new Date(),
      changeFrequency: doc._type === 'news' ? 'never' : 'monthly',
      priority: doc._type === 'page' ? 0.8 : 0.5,
    });
  }

  for (const m of teamSlugs ?? []) {
    if (!m.slug) continue;
    entries.push({
      url: `${BASE}/leadership/${m.slug}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }

  return entries;
}
