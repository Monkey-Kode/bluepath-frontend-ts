import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { transitionNames } from '@/test/stubs/ViewTransition';
import ArticleArchive, { type ArchiveItem } from './ArticleArchive';
import ArticleView from './ArticleView';

vi.mock('next/link', () => ({
  default: ({ href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props} />
  ),
}));
vi.mock(
  '@/components/ViewTransition',
  () => import('@/test/stubs/ViewTransition'),
);
vi.mock('@/components/SanityImage', () => import('@/test/stubs/SanityImage'));

const caseStudy: ArchiveItem = {
  kind: 'caseStudy',
  id: 'cs-1',
  slug: 'lincoln-solar',
  title: 'Lincoln Middle School',
  subhead: 'Solar on every roof',
  label: 'Solar · Lincoln, Nebraska',
  excerpt: 'How the district cut its bills.',
  date: '2026-04-02T12:00:00Z',
  image: { asset: { _id: 'thumb-1' } },
};

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

describe('ArticleArchive for case studies', () => {
  it('links a case study card to its page with the CONTINUE READING button', () => {
    render(<ArticleArchive heading="Case Studies" items={[caseStudy]} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Case Studies' }),
    ).toBeInTheDocument();
    const card = screen.getByRole('article');
    expect(within(card).getByText('April 2, 2026')).toBeInTheDocument();
    expect(
      within(card).getByText('Solar · Lincoln, Nebraska'),
    ).toBeInTheDocument();
    expect(
      within(card)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/case-studies/lincoln-solar',
      '/case-studies/lincoln-solar',
      '/case-studies/lincoln-solar',
    ]);
    expect(
      within(card).getByRole('link', { name: /CONTINUE READING/ }),
    ).toBeInTheDocument();
  });

  it("gives the card the same transition names as the article's hero and title (AC-5.2)", () => {
    const { container } = render(
      <ArticleArchive heading="Case Studies" items={[caseStudy]} />,
    );
    const card = transitionNames(container);
    cleanup();
    const { container: page } = render(
      <ArticleView
        kind="caseStudy"
        slug="lincoln-solar"
        article={{
          title: 'Lincoln Middle School',
          heroImage: { asset: { _id: 'hero-1' } },
        }}
      />,
    );
    expect(card).toEqual([
      ['media-caseStudy-lincoln-solar', 'morph-media'],
      ['title-caseStudy-lincoln-solar', 'morph'],
    ]);
    expect(transitionNames(page)).toEqual([card[1], card[0]]);
  });

  it('shows the empty message instead of cards when there are none', () => {
    render(
      <ArticleArchive
        heading="Case Studies"
        items={[]}
        emptyMessage="No case studies yet."
      />,
    );
    expect(screen.getByText('No case studies yet.')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('leaves out the empty message once a case study shows', () => {
    render(
      <ArticleArchive
        heading="Case Studies"
        items={[caseStudy]}
        emptyMessage="No case studies yet."
      />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.queryByText('No case studies yet.')).not.toBeInTheDocument();
  });
});

describe('ArticleArchive LOAD MORE', () => {
  /** Case studies "Story 1" to "Story N", newest first. */
  const stories = (count: number): ArchiveItem[] =>
    Array.from({ length: count }, (_, i) => ({
      ...caseStudy,
      id: `cs-${i + 1}`,
      slug: `story-${i + 1}`,
      title: `Story ${i + 1}`,
      date: new Date(Date.UTC(2026, 0, 31 - i)).toISOString(),
    }));
  const titleLink = (title: string) =>
    within(screen.getByRole('heading', { level: 2, name: title })).getByRole(
      'link',
    );

  it("moves focus to the first new card's title, also when the button goes (WCAG 2.4.3)", async () => {
    const user = userEvent.setup();
    render(<ArticleArchive heading="Case Studies" items={stories(21)} />);
    expect(screen.getAllByRole('article')).toHaveLength(10);

    await user.click(screen.getByRole('button', { name: 'LOAD MORE' }));
    expect(screen.getAllByRole('article')).toHaveLength(20);
    expect(titleLink('Story 11')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'LOAD MORE' }));
    expect(screen.getAllByRole('article')).toHaveLength(21);
    expect(screen.queryByRole('button', { name: 'LOAD MORE' })).toBeNull();
    expect(titleLink('Story 21')).toHaveFocus();
  });

  it('leaves focus alone on the first render', () => {
    render(<ArticleArchive heading="Case Studies" items={stories(11)} />);
    expect(document.body).toHaveFocus();
  });
});
