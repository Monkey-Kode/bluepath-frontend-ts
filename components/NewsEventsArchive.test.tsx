import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllEventsQueryResult, AllNewsQueryResult } from '@/sanity.types';
import { transitionNames } from '@/test/stubs/ViewTransition';
import NewsEventsArchive from './NewsEventsArchive';

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

type News = AllNewsQueryResult[number];
type Event = AllEventsQueryResult[number];

const image = (id: string) => ({ asset: { _id: id } }) as News['heroImage'];

const news = (n: number, extra: Partial<News> = {}): News => ({
  _id: `news-${n}`,
  title: `News ${n}`,
  slug: `news-${n}`,
  subhead: null,
  publication: null,
  publishedAt: `2026-01-${String(n).padStart(2, '0')}T12:00:00Z`,
  excerpt: null,
  heroImage: null,
  featuredImage: null,
  ...extra,
});

const event = (extra: Partial<Event> = {}): Event => ({
  _id: 'event-1',
  name: 'Summit',
  slug: 'summit',
  eventAt: '2026-02-15',
  description: 'A day of talks.',
  publication: 'CONFERENCE',
  image: null,
  ...extra,
});

// The schema requires these fields, so typegen marks them present. Older documents can lack them.
const missing = null as unknown as string;

const cards = () => screen.getAllByRole('article');

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

describe('NewsEventsArchive today', () => {
  it('lists news and events newest first under the page heading', () => {
    render(
      <NewsEventsArchive
        news={[news(3), news(20)]}
        events={[event({ eventAt: '2026-01-10' })]}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'News & Events' }),
    ).toBeInTheDocument();
    expect(
      cards().map((card) => within(card).getByRole('heading').textContent),
    ).toEqual(['News 20', 'Summit', 'News 3']);
  });

  it('shows the date, label, title, subhead, excerpt, and button on a news card', () => {
    render(
      <NewsEventsArchive
        news={[
          news(5, {
            publication: 'PRESS RELEASE',
            subhead: 'A subhead',
            excerpt: 'An excerpt',
          }),
        ]}
        events={[]}
      />,
    );
    const card = cards()[0];
    expect(within(card).getByText('January 5, 2026').tagName).toBe('TIME');
    expect(within(card).getByText('PRESS RELEASE')).toBeInTheDocument();
    expect(within(card).getByText('A subhead')).toBeInTheDocument();
    expect(within(card).getByText('An excerpt')).toBeInTheDocument();
    expect(
      within(card)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/news/news-5', '/news/news-5', '/news/news-5']);
    expect(
      within(card).getByRole('link', { name: /CONTINUE READING/ }),
    ).toBeInTheDocument();
  });

  it('links an event card to its event page with its own button', () => {
    render(<NewsEventsArchive news={[]} events={[event()]} />);
    const card = cards()[0];
    expect(within(card).getByText('February 15, 2026')).toBeInTheDocument();
    expect(within(card).getByText('CONFERENCE')).toBeInTheDocument();
    expect(within(card).getByText('A day of talks.')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: /VIEW EVENT DETAILS/ }),
    ).toHaveAttribute('href', '/events/summit');
  });

  it('names the image and title transitions after the kind and slug', () => {
    const { container } = render(
      <NewsEventsArchive news={[news(5)]} events={[event()]} />,
    );
    expect(transitionNames(container)).toEqual([
      ['media-event-summit', 'morph-media'],
      ['title-event-summit', 'morph'],
      ['media-news-news-5', 'morph-media'],
      ['title-news-news-5', 'morph'],
    ]);
  });

  it('prefers the featured image and falls back to the hero image', () => {
    const { container } = render(
      <NewsEventsArchive
        news={[
          news(2, {
            heroImage: image('hero-2'),
            featuredImage: image('feat-2'),
          }),
          news(1, { heroImage: image('hero-1') }),
        ]}
        events={[]}
      />,
    );
    expect(
      [...container.querySelectorAll('img')].map((img) =>
        img.getAttribute('data-image-id'),
      ),
    ).toEqual(['feat-2', 'hero-1']);
  });

  it('leaves out items with no slug or date', () => {
    render(
      <NewsEventsArchive
        news={[
          news(1),
          news(2, { slug: missing }),
          news(3, { publishedAt: missing }),
        ]}
        events={[event({ eventAt: null })]}
      />,
    );
    expect(cards()).toHaveLength(1);
  });

  it('shows ten cards at a time and hides LOAD MORE when all show', async () => {
    const user = userEvent.setup();
    render(
      <NewsEventsArchive
        news={Array.from({ length: 23 }, (_, i) => news(i + 1))}
        events={[]}
      />,
    );
    expect(cards()).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: 'LOAD MORE' }));
    expect(cards()).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'LOAD MORE' }));
    expect(cards()).toHaveLength(23);
    expect(
      screen.queryByRole('button', { name: 'LOAD MORE' }),
    ).not.toBeInTheDocument();
  });

  it('shows only the heading when nothing is published', () => {
    render(<NewsEventsArchive news={[]} events={[]} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('main').textContent).toBe('News & Events');
  });
});
