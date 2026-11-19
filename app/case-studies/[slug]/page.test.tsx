import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CaseStudyArchive from '@/components/CaseStudyArchive';
import { sanityFetch } from '@/sanity/lib/live';
import type {
  AllCaseStudiesQueryResult,
  CaseStudyBySlugQueryResult,
} from '@/sanity.types';
import { transitionNames } from '@/test/stubs/ViewTransition';
import CaseStudyPage, { generateMetadata, generateStaticParams } from './page';

vi.mock('@/sanity/lib/live', () => ({ sanityFetch: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound');
  },
}));
vi.mock('next/link', () => ({
  default: ({ href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props} />
  ),
}));
vi.mock('@/components/SiteHeader', () => ({ default: () => null }));
vi.mock('@/components/SiteFooter', () => ({ default: () => null }));
vi.mock(
  '@/components/ViewTransition',
  () => import('@/test/stubs/ViewTransition'),
);
vi.mock('@/components/SanityImage', () => import('@/test/stubs/SanityImage'));

type CaseStudy = NonNullable<CaseStudyBySlugQueryResult>;

const project = {
  plantName: 'Lincoln Middle School',
  projectName: null,
  title: null,
  projectType: 'Solar',
  technologies: null,
  city: 'Lincoln',
  state: 'NE',
};

const body = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'h2',
    markDefs: [],
    children: [{ _type: 'span', _key: 's1', text: 'The plan' }],
  },
  {
    _type: 'block',
    _key: 'b2',
    style: 'normal',
    markDefs: [
      {
        _type: 'internalLink',
        _key: 'l1',
        reference: { _type: 'news', slug: { _type: 'slug', current: 'fund' } },
      },
    ],
    children: [
      { _type: 'span', _key: 's2', text: 'Read the news', marks: ['l1'] },
    ],
  },
  {
    _type: 'imageWithCaption',
    _key: 'i1',
    alt: 'Panels on the roof',
    caption: 'The finished roof',
    markDefs: null,
    image: {
      _type: 'image',
      asset: { url: 'https://cdn.example/roof.jpg', altText: null },
    },
  },
] satisfies CaseStudy['body'];

const caseStudy = (fields: Partial<CaseStudy> = {}): CaseStudy => ({
  _id: 'cs-1',
  _type: 'caseStudy',
  title: 'How Lincoln went solar',
  slug: 'lincoln-solar',
  subhead: null,
  publishedAt: '2026-04-02T12:00:00Z',
  excerpt: 'The excerpt.',
  heroImage: {
    _type: 'image',
    alt: '',
    caption: 'Photo: the district',
    asset: {
      _id: 'hero-1',
      url: 'https://cdn.example/hero.jpg',
      metadata: null,
    },
  },
  body,
  seoDescription: 'The SEO description.',
  project,
  ...fields,
});

const fetchReturns = (data: CaseStudy | null) =>
  vi.mocked(sanityFetch).mockResolvedValue({ data } as never);

const params = Promise.resolve({ slug: 'lincoln-solar' });

beforeEach(() => {
  vi.mocked(sanityFetch).mockReset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

describe('case study metadata (AC-5.4)', () => {
  it('sets the title, the SEO description, the hero as the sharing image, and the date, as News does', async () => {
    fetchReturns(caseStudy());
    expect(await generateMetadata({ params })).toEqual({
      title: 'How Lincoln went solar',
      description: 'The SEO description.',
      openGraph: {
        type: 'article',
        images: ['https://cdn.example/hero.jpg'],
        publishedTime: '2026-04-02T12:00:00.000Z',
      },
    });
    expect(sanityFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { slug: 'lincoln-solar' },
        stega: false,
      }),
    );
  });

  it("falls back to the excerpt, and a blank title to the project's name (D-12)", async () => {
    fetchReturns(caseStudy({ title: null, seoDescription: null }));
    expect(await generateMetadata({ params })).toMatchObject({
      title: 'Lincoln Middle School',
      description: 'The excerpt.',
    });
  });

  it('returns no metadata for an unknown slug', async () => {
    fetchReturns(null);
    expect(await generateMetadata({ params })).toEqual({});
  });
});

describe('case study page', () => {
  it('shows the 404 page for an unknown slug (AC-5.3)', async () => {
    fetchReturns(null);
    await expect(CaseStudyPage({ params })).rejects.toThrow('notFound');
  });

  it('shows the title, label, hero with caption, date, and body in the article layout (AC-5.3)', async () => {
    fetchReturns(caseStudy());
    render(await CaseStudyPage({ params }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'How Lincoln went solar' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Solar · Lincoln, Nebraska')).toBeInTheDocument();
    expect(screen.getByText('Photo: the district')).toBeInTheDocument();
    expect(screen.getByText('April 2, 2026')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'The plan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read the news' })).toHaveAttribute(
      'href',
      '/news/fund',
    );
    expect(
      screen.getByRole('img', { name: 'Panels on the roof' }),
    ).toHaveAttribute('src', 'https://cdn.example/roof.jpg');
    expect(screen.getByText('The finished roof')).toBeInTheDocument();
  });

  it("uses the project's name for a blank title (D-12)", async () => {
    fetchReturns(caseStudy({ title: ' ' }));
    render(await CaseStudyPage({ params }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Lincoln Middle School' }),
    ).toBeInTheDocument();
  });

  it("gives the hero and title the archive card's transition names (AC-5.2)", async () => {
    const archived: AllCaseStudiesQueryResult[number] = {
      ...caseStudy(),
      slug: 'lincoln-solar',
      featuredImage: null,
    };
    const { container: archive } = render(
      <CaseStudyArchive caseStudies={[archived]} />,
    );
    const card = transitionNames(archive);
    cleanup();
    fetchReturns(caseStudy());
    const { container: page } = render(await CaseStudyPage({ params }));
    expect(card).toEqual([
      ['media-caseStudy-lincoln-solar', 'morph-media'],
      ['title-caseStudy-lincoln-solar', 'morph'],
    ]);
    expect(transitionNames(page)).toEqual([card[1], card[0]]);
  });

  it('builds a page for every case study with a slug', async () => {
    vi.mocked(sanityFetch).mockResolvedValue({
      data: [{ slug: 'lincoln-solar' }, { slug: null }],
    } as never);
    expect(await generateStaticParams()).toEqual([{ slug: 'lincoln-solar' }]);
  });
});
