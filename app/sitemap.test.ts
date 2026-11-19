import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sanityFetch } from '@/sanity/lib/live';
import { sitemapQuery, teamSlugsQuery } from '@/sanity/lib/queries';
import type { SitemapQueryResult, TeamSlugsQueryResult } from '@/sanity.types';
import sitemap from './sitemap';

vi.mock('@/sanity/lib/live', () => ({ sanityFetch: vi.fn() }));
vi.mock('@/lib/siteUrl', () => ({ getSiteUrl: () => 'https://site.test' }));

const NOW = new Date('2026-11-04T12:00:00Z');
const EDITED = '2026-10-01T08:00:00Z';

const fetchReturns = (
  docs: SitemapQueryResult,
  team: TeamSlugsQueryResult = [],
) =>
  vi.mocked(sanityFetch).mockImplementation((async ({
    query,
  }: {
    query: string;
  }) => {
    if (query === sitemapQuery) return { data: docs };
    if (query === teamSlugsQuery) return { data: team };
    throw new Error(`unexpected query: ${query}`);
  }) as never);

const doc = (_type: SitemapQueryResult[number]['_type'], slug: string | null) =>
  ({ _type, slug, _updatedAt: EDITED }) as SitemapQueryResult[number];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.mocked(sanityFetch).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sitemap', () => {
  it('lists the fixed routes', async () => {
    fetchReturns([]);
    expect(await sitemap()).toEqual(
      ['', 'leadership/', 'news-and-events/', 'case-studies/', 'thankyou/'].map(
        (path) => ({
          url: `https://site.test/${path}`,
          lastModified: NOW,
          changeFrequency: 'monthly',
          priority: path === '' ? 1 : 0.7,
        }),
      ),
    );
  });

  it('lists pages, news, events, and team members at their own paths', async () => {
    fetchReturns(
      [doc('page', 'impact'), doc('news', 'fund'), doc('event', 'summit')],
      [{ slug: 'jane-doe' }] as TeamSlugsQueryResult,
    );
    const entries = (await sitemap()).slice(5);
    expect(entries).toEqual([
      {
        url: 'https://site.test/impact/',
        lastModified: new Date(EDITED),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: 'https://site.test/news/fund/',
        lastModified: new Date(EDITED),
        changeFrequency: 'never',
        priority: 0.5,
      },
      {
        url: 'https://site.test/events/summit/',
        lastModified: new Date(EDITED),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: 'https://site.test/leadership/jane-doe/',
        lastModified: NOW,
        changeFrequency: 'monthly',
        priority: 0.5,
      },
    ]);
  });

  it('lists every published case study under /case-studies/ (AC-5.5)', async () => {
    fetchReturns([doc('caseStudy', 'lincoln-solar')]);
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toContain(
      'https://site.test/case-studies/',
    );
    expect(entries.at(-1)).toEqual({
      url: 'https://site.test/case-studies/lincoln-solar/',
      lastModified: new Date(EDITED),
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  });

  it('skips documents without a slug and pages that a fixed route owns', async () => {
    fetchReturns([
      doc('news', null),
      doc('page', 'leadership'),
      doc('page', 'news-and-events'),
      doc('page', 'case-studies'),
      doc('caseStudy', null),
    ]);
    expect(await sitemap()).toHaveLength(5);
  });

  it('reads only published documents without stega', async () => {
    fetchReturns([]);
    await sitemap();
    for (const [args] of vi.mocked(sanityFetch).mock.calls) {
      expect(args).toMatchObject({ perspective: 'published', stega: false });
    }
  });
});
