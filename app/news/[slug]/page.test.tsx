import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sanityFetch } from '@/sanity/lib/live';
import type { NewsBySlugQueryResult } from '@/sanity.types';
import NewsArticlePage, { generateMetadata } from './page';

vi.mock('@/sanity/lib/live', () => ({ sanityFetch: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound');
  },
}));
vi.mock('@/components/SiteHeader', () => ({ default: () => null }));
vi.mock('@/components/SiteFooter', () => ({ default: () => null }));
vi.mock(
  '@/components/ViewTransition',
  () => import('@/test/stubs/ViewTransition'),
);
vi.mock('@/components/SanityImage', () => import('@/test/stubs/SanityImage'));

type Article = NonNullable<NewsBySlugQueryResult>;

const article = (fields: Partial<Article> = {}) =>
  ({
    _id: 'n-1',
    _type: 'news',
    title: 'BluePath closes a fund',
    slug: 'fund',
    subhead: null,
    publication: 'PRESS RELEASE',
    publishedAt: '2026-03-10T15:00:00Z',
    excerpt: 'The excerpt.',
    heroImage: {
      _type: 'image',
      alt: '',
      asset: {
        _id: 'hero-1',
        url: 'https://cdn.example/hero.jpg',
        metadata: null,
      },
    },
    featuredImage: null,
    body: null,
    seoDescription: 'The SEO description.',
    ...fields,
  }) as Article;

const fetchReturns = (data: Article | null) =>
  vi.mocked(sanityFetch).mockResolvedValue({ data } as never);

const params = Promise.resolve({ slug: 'fund' });

beforeEach(() => {
  vi.mocked(sanityFetch).mockReset();
});

describe('news article metadata', () => {
  it('sets the title, the SEO description, the hero as the sharing image, and the date', async () => {
    fetchReturns(article());
    expect(await generateMetadata({ params })).toEqual({
      title: 'BluePath closes a fund',
      description: 'The SEO description.',
      openGraph: {
        type: 'article',
        images: ['https://cdn.example/hero.jpg'],
        publishedTime: '2026-03-10T15:00:00.000Z',
      },
    });
    expect(sanityFetch).toHaveBeenCalledWith(
      expect.objectContaining({ params: { slug: 'fund' }, stega: false }),
    );
  });

  it('falls back to the excerpt, and leaves out a missing image and date', async () => {
    fetchReturns(
      article({
        seoDescription: null,
        heroImage: null,
        publishedAt: null as never,
      }),
    );
    expect(await generateMetadata({ params })).toEqual({
      title: 'BluePath closes a fund',
      description: 'The excerpt.',
      openGraph: { type: 'article', images: [] },
    });
  });

  it('returns no metadata for an unknown slug', async () => {
    fetchReturns(null);
    expect(await generateMetadata({ params })).toEqual({});
  });
});

describe('news article page', () => {
  it('shows the 404 page for an unknown slug', async () => {
    fetchReturns(null);
    await expect(NewsArticlePage({ params })).rejects.toThrow('notFound');
  });

  it('shows the article without a label', async () => {
    fetchReturns(article());
    render(await NewsArticlePage({ params }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'BluePath closes a fund' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('PRESS RELEASE')).not.toBeInTheDocument();
  });
});
