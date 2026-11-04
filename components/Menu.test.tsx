import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NavigationQueryResult } from '@/sanity.types';
import Menu from './Menu';

vi.mock('next/navigation', () => ({ usePathname: () => '/about/' }));
// A plain anchor keeps Menu's own href. Next's Link would apply its trailing-slash setting.
vi.mock('next/link', () => ({
  default: ({ href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props} />
  ),
}));

type NavItem = NavigationQueryResult[number];

const blank: NavItem = {
  _id: '',
  name: null,
  linkType: null,
  jumpLinkId: null,
  url: null,
  header: null,
  footer: null,
  order: null,
  page: null,
  parent: null,
};

const page = (slug: string) => ({ _type: 'page' as const, slug });

/** Today's menu, plus one sub-item saved before the release with both boxes unset. */
const navigation: NavItem[] = [
  {
    ...blank,
    _id: 'about',
    name: 'About',
    header: true,
    footer: true,
    order: 2,
    page: page('about'),
  },
  {
    ...blank,
    _id: 'contact',
    name: 'Contact',
    header: true,
    order: 1,
    url: 'https://www.bluepathfinance.com/contact/',
  },
  {
    ...blank,
    _id: 'news',
    name: 'News',
    footer: true,
    order: 3,
    page: page('news-and-events'),
  },
  {
    ...blank,
    _id: 'team',
    name: 'Team',
    header: true,
    order: 4,
    linkType: true,
    jumpLinkId: 'team',
  },
  {
    ...blank,
    _id: 'projects',
    name: 'Projects',
    header: true,
    footer: true,
    order: 5,
    page: page('projects'),
  },
  {
    ...blank,
    _id: 'map',
    name: 'Map',
    order: 1,
    parent: 'projects',
    page: page('projects'),
  },
];

/** The menu's links in reading order, as "name href" pairs. */
const links = (siteLocation: 'header' | 'footer', items = navigation) => {
  const { container } = render(
    <Menu open={false} siteLocation={siteLocation} navigation={items} />,
  );
  return within(container)
    .getAllByRole('link')
    .map((link) => `${link.textContent} ${link.getAttribute('href')}`);
};

describe('Menu on content without sub-items (characterization)', () => {
  it('lists the header items in Order with their links', () => {
    expect(links('header')).toEqual([
      'Contact /contact/',
      'About /about',
      'Team /team',
      'Projects /projects',
    ]);
  });

  it('lists the footer items in Order with their links', () => {
    expect(links('footer')).toEqual([
      'About /about',
      'News /news-and-events',
      'Projects /projects',
    ]);
  });

  it('hides a sub-item whose Header and Footer boxes are unset (AC-0.1)', () => {
    for (const siteLocation of ['header', 'footer'] as const) {
      render(
        <Menu
          open={false}
          siteLocation={siteLocation}
          navigation={navigation}
        />,
      );
    }
    expect(screen.queryByRole('link', { name: 'Map' })).toBeNull();
  });
});

describe('Menu with sub-items', () => {
  const withSubItems: NavItem[] = [
    ...navigation.filter(({ _id }) => _id !== 'map'),
    {
      ...blank,
      _id: 'map',
      name: 'Map',
      header: true,
      order: 1,
      parent: 'projects',
      page: page('projects'),
    },
    {
      ...blank,
      _id: 'case-studies',
      name: 'Case Studies',
      footer: true,
      order: 2,
      parent: 'projects',
      page: page('case-studies'),
    },
  ];

  it('keeps a sub-item out of the header row, even with its Header box checked (AC-1.5)', () => {
    expect(links('header', withSubItems)).toEqual([
      'Contact /contact/',
      'About /about',
      'Team /team',
      'Projects /projects',
    ]);
  });

  it('lists a sub-item with its Footer box checked right after its parent (AC-1.6)', () => {
    expect(links('footer', withSubItems)).toEqual([
      'About /about',
      'News /news-and-events',
      'Projects /projects',
      'Case Studies /case-studies',
    ]);
  });
});
