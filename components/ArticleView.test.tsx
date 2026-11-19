import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NewsBySlugQueryResult } from '@/sanity.types';
import { transitionNames } from '@/test/stubs/ViewTransition';
import ArticleView from './ArticleView';

vi.mock(
  '@/components/ViewTransition',
  () => import('@/test/stubs/ViewTransition'),
);
vi.mock('@/components/SanityImage', () => import('@/test/stubs/SanityImage'));

type Article = NonNullable<NewsBySlugQueryResult>;

const article = (extra: Partial<Article> = {}): Article =>
  ({
    _id: 'news-1',
    _type: 'news',
    title: 'Solar for schools',
    slug: 'solar-for-schools',
    subhead: 'A subhead',
    publication: 'PRESS RELEASE',
    publishedAt: '2026-03-10T12:00:00Z',
    excerpt: 'An excerpt',
    heroImage: {
      asset: { _id: 'hero-1' },
      caption: 'The roof array',
    } as Article['heroImage'],
    featuredImage: null,
    body: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          { _type: 'span', _key: 's1', text: 'Body text.', marks: [] },
        ],
      },
    ] as Article['body'],
    seoDescription: null,
    ...extra,
  }) as Article;

// The schema requires these fields, so typegen marks them present. Older documents can lack them.
const missing = null as unknown as string;

const renderNews = (value: Article) =>
  render(<ArticleView kind="news" article={value} slug="solar-for-schools" />);

describe('ArticleView for news, as before case studies', () => {
  it('shows the title, hero with caption, date, and body in that order', () => {
    const { container } = renderNews(article());
    expect(
      screen.getByRole('heading', { level: 1, name: 'Solar for schools' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('data-image-id', 'hero-1');
    expect(screen.getByText('The roof array').tagName).toBe('FIGCAPTION');
    expect(screen.getByText('March 10, 2026').tagName).toBe('TIME');
    expect(screen.getByText('Body text.').tagName).toBe('P');
    const order = [
      ...container.querySelectorAll('article > *, article > * > *'),
    ].map((node) => node.tagName);
    expect(
      order.filter((tag) => ['H1', 'FIGURE', 'TIME'].includes(tag)),
    ).toEqual(['H1', 'FIGURE', 'TIME']);
  });

  it('names the title and hero transitions after news and the slug', () => {
    const { container } = renderNews(article());
    expect(transitionNames(container)).toEqual([
      ['title-news-solar-for-schools', 'morph'],
      ['media-news-solar-for-schools', 'morph-media'],
    ]);
  });

  it('leaves out the publication label, which only the archive card shows', () => {
    renderNews(article());
    expect(screen.getByText('March 10, 2026')).toBeInTheDocument();
    expect(screen.queryByText('PRESS RELEASE')).not.toBeInTheDocument();
  });

  it('leaves out the hero, date, and body when they are empty', () => {
    const { container } = renderNews(
      article({ heroImage: null, publishedAt: missing, body: null }),
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('time')).toBeNull();
    expect(container.querySelector('.prose')).toBeNull();
  });
});

describe('ArticleView for a case study', () => {
  it('shows the label between the title and the hero (AC-5.3)', () => {
    const { container } = render(
      <ArticleView
        kind="caseStudy"
        slug="lincoln-solar"
        article={{
          title: 'Lincoln Middle School',
          label: 'Solar · Lincoln, Nebraska',
          heroImage: { asset: { _id: 'hero-1' }, caption: 'The roof array' },
          publishedAt: '2026-04-02T12:00:00Z',
        }}
      />,
    );
    const label = screen.getByText('Solar · Lincoln, Nebraska');
    const title = screen.getByRole('heading', { level: 1 });
    const figure = container.querySelector('figure') as Element;
    expect(
      title.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      label.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(transitionNames(container)).toEqual([
      ['title-caseStudy-lincoln-solar', 'morph'],
      ['media-caseStudy-lincoln-solar', 'morph-media'],
    ]);
  });
});
