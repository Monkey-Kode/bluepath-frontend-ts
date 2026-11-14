import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllCaseStudiesQueryResult } from '@/sanity.types';
import CaseStudyArchive from './CaseStudyArchive';

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

type CaseStudy = AllCaseStudiesQueryResult[number];
type Project = NonNullable<CaseStudy['project']>;

const image = (id: string) =>
  ({ _type: 'image', alt: '', asset: { _id: id } }) as CaseStudy['heroImage'];

const project = (fields: Partial<Project> = {}): Project => ({
  plantName: 'Lincoln Middle School',
  projectName: null,
  title: null,
  projectType: 'Solar',
  technologies: null,
  city: 'Lincoln',
  state: 'NE',
  ...fields,
});

const caseStudy = (fields: Partial<CaseStudy> = {}): CaseStudy => ({
  _id: 'cs-1',
  title: 'How Lincoln went solar',
  slug: 'lincoln-solar',
  subhead: 'Solar on every roof',
  publishedAt: '2026-04-02T12:00:00Z',
  excerpt: 'How the district cut its bills.',
  heroImage: image('hero-1'),
  featuredImage: image('thumb-1'),
  project: project(),
  ...fields,
});

const cardTitles = () =>
  screen
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

describe('CaseStudyArchive', () => {
  it('shows a card with the date, the project label, and a link to the case study (AC-5.1)', () => {
    render(<CaseStudyArchive caseStudies={[caseStudy()]} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Case Studies' }),
    ).toBeInTheDocument();
    const card = screen.getByRole('article');
    expect(within(card).getByText('April 2, 2026')).toBeInTheDocument();
    expect(
      within(card).getByText('Solar · Lincoln, Nebraska'),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('heading', { name: 'How Lincoln went solar' }),
    ).toBeInTheDocument();
    expect(within(card).getByText('Solar on every roof')).toBeInTheDocument();
    expect(
      within(card).getByText('How the district cut its bills.'),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: /CONTINUE READING/ }),
    ).toHaveAttribute('href', '/case-studies/lincoln-solar');
  });

  it('shows the featured image, else the hero image', () => {
    const { container, rerender } = render(
      <CaseStudyArchive caseStudies={[caseStudy()]} />,
    );
    expect(container.querySelector('img')?.getAttribute('data-image-id')).toBe(
      'thumb-1',
    );
    rerender(
      <CaseStudyArchive caseStudies={[caseStudy({ featuredImage: null })]} />,
    );
    expect(container.querySelector('img')?.getAttribute('data-image-id')).toBe(
      'hero-1',
    );
  });

  it("uses the project's name for a blank title (D-12)", () => {
    render(
      <CaseStudyArchive
        caseStudies={[
          caseStudy({ _id: 'a', slug: 'a', title: '  ' }),
          caseStudy({
            _id: 'b',
            slug: 'b',
            title: null,
            project: project({
              plantName: null,
              projectName: 'Kearney Bus Barn',
            }),
          }),
        ]}
      />,
    );
    expect(cardTitles()).toEqual(['Lincoln Middle School', 'Kearney Bus Barn']);
  });

  it("labels each card with the parts of the project's category and place that exist", () => {
    render(
      <CaseStudyArchive
        caseStudies={[
          caseStudy({
            _id: 'type-only',
            slug: 'type-only',
            project: project({
              projectType: 'Solar + BESS',
              city: null,
              state: null,
            }),
          }),
          caseStudy({
            _id: 'from-technologies',
            slug: 'from-technologies',
            project: project({
              projectType: null,
              technologies: ['Battery Storage'],
              city: 'Newton',
              state: 'Massachusetts',
            }),
          }),
          caseStudy({
            _id: 'place-only',
            slug: 'place-only',
            project: project({ projectType: 'Unknown' }),
          }),
          caseStudy({
            _id: 'no-project',
            slug: 'no-project',
            title: 'No project',
            // A draft in the Presentation preview can lack a required field.
            project: null as never,
          }),
        ]}
      />,
    );
    const labels = screen
      .getAllByRole('article')
      .map((card) => card.querySelector('time + span')?.textContent ?? null);
    expect(labels).toEqual([
      'Solar + Battery',
      'Battery · Newton, Massachusetts',
      'Lincoln, Nebraska',
      null,
    ]);
  });

  it('leaves out a case study without a published date', () => {
    render(
      <CaseStudyArchive
        caseStudies={[
          caseStudy({ _id: 'dated', slug: 'dated', title: 'Dated' }),
          caseStudy({
            _id: 'undated',
            slug: 'undated',
            title: 'Undated',
            publishedAt: null as never,
          }),
        ]}
      />,
    );
    expect(cardTitles()).toEqual(['Dated']);
  });

  it('shows ten case studies at a time, newest first, with LOAD MORE (AC-5.1)', () => {
    const studies = Array.from({ length: 12 }, (_, i) =>
      caseStudy({
        _id: `cs-${i}`,
        slug: `cs-${i}`,
        title: `Case ${i}`,
        publishedAt: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
      }),
    );
    render(<CaseStudyArchive caseStudies={studies} />);
    expect(cardTitles()).toEqual(
      Array.from({ length: 10 }, (_, i) => `Case ${11 - i}`),
    );
    fireEvent.click(screen.getByRole('button', { name: 'LOAD MORE' }));
    expect(cardTitles()).toHaveLength(12);
    expect(cardTitles().slice(-2)).toEqual(['Case 1', 'Case 0']);
    expect(
      screen.queryByRole('button', { name: 'LOAD MORE' }),
    ).not.toBeInTheDocument();
  });

  it('shows a short message when no case study is published (D-6)', () => {
    render(<CaseStudyArchive caseStudies={[]} />);
    expect(screen.getByText('No case studies yet.')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
});
