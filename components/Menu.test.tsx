import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

/** Today's menu, before any sub-items exist. */
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
];

/** The release's menu. Map's Header box is checked and Case Studies' is not. */
const withSubItems: NavItem[] = [
  ...navigation,
  {
    ...blank,
    _id: 'case-studies',
    name: 'Case Studies',
    footer: true,
    order: 2,
    parent: 'projects',
    page: page('case-studies'),
  },
  {
    ...blank,
    _id: 'map',
    name: 'Map',
    header: true,
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

  it('keeps "Projects" a plain link while it has no sub-items (AC-1.5)', () => {
    links('header');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lists the footer items in Order with their links', () => {
    expect(links('footer')).toEqual([
      'About /about',
      'News /news-and-events',
      'Projects /projects',
    ]);
  });
});

describe('Menu with sub-items', () => {
  it('keeps sub-items out of the header row, whatever their Header box says (AC-1.5)', () => {
    render(
      <Menu open={false} siteLocation="header" navigation={withSubItems} />,
    );
    const row = screen
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild?.textContent);
    expect(row).toEqual(['Contact', 'About', 'Team', 'Projects']);
    expect(screen.queryByRole('link', { name: 'Map' })).toBeNull();
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

/** Stubs the viewport. Below the tablet breakpoint, the header shows its drawer. */
const viewport = (layout: 'desktop' | 'drawer') =>
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: layout === 'desktop',
    media,
  }));

/** Renders the header menu with sub-items, plus a control outside it. */
function header() {
  const setOpen = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <Menu
        open
        setOpen={setOpen}
        siteLocation="header"
        navigation={withSubItems}
      />
      <button type="button">Outside</button>
    </>,
  );
  const toggle = screen.getByRole('button', { name: 'Projects' });
  const dropdown = () => {
    const id = toggle.getAttribute('aria-controls');
    const list = id && document.getElementById(id);
    if (!list) throw new Error('The toggle controls no element');
    return list;
  };
  const item = (name: string) => within(dropdown()).getByRole('link', { name });
  return { setOpen, user, toggle, dropdown, item };
}

describe('Projects dropdown on desktop (AC-1.1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens on click with Map and Case Studies, and a second click closes it', async () => {
    viewport('desktop');
    const { user, toggle, dropdown } = header();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(dropdown()).not.toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(dropdown()).toBeVisible();
    const items = within(dropdown())
      .getAllByRole('link')
      .map((link) => `${link.textContent} ${link.getAttribute('href')}`);
    expect(items).toEqual(['Map /projects', 'Case Studies /case-studies']);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(dropdown()).not.toBeVisible();
  });

  it('opens on hover and closes when the pointer leaves', async () => {
    viewport('desktop');
    const { user, toggle, dropdown, item } = header();
    await user.hover(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.hover(item('Case Studies'));
    expect(dropdown()).toBeVisible();

    await user.unhover(item('Case Studies'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape after a hover opened it, with focus outside it (WCAG 1.4.13)', async () => {
    viewport('desktop');
    const { user, toggle } = header();
    screen.getByRole('button', { name: 'Outside' }).focus();
    await user.hover(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });

  it('closes once both pointer and focus have left it', async () => {
    viewport('desktop');
    const { user, toggle } = header();
    await user.click(toggle);
    await user.unhover(toggle);
    await user.tab();
    await user.tab();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.tab();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Projects dropdown from the keyboard (AC-1.2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens with Enter and closes with Space after Tab reaches "Projects"', async () => {
    viewport('desktop');
    const { user, toggle, dropdown } = header();
    for (let i = 0; i < 4; i++) await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(dropdown()).toBeVisible();

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves through the items with Tab and the arrow keys', async () => {
    viewport('desktop');
    const { user, toggle, item } = header();
    toggle.focus();
    await user.keyboard('{ArrowDown}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(item('Map')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(item('Case Studies')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(item('Map')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(toggle).toHaveFocus();

    await user.tab();
    expect(item('Map')).toHaveFocus();
    await user.tab();
    expect(item('Case Studies')).toHaveFocus();
  });

  it('closes on Escape and returns focus to "Projects"', async () => {
    viewport('desktop');
    const { user, toggle, item } = header();
    toggle.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(item('Case Studies')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});

describe('Projects in the mobile drawer (AC-1.3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const tap = (user: ReturnType<typeof userEvent.setup>, target: Element) =>
    user.pointer({ keys: '[TouchA]', target });

  it('shows Map and Case Studies on a tap and hides them on a second tap', async () => {
    viewport('drawer');
    const { user, toggle, dropdown } = header();
    await tap(user, toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(dropdown()).toBeVisible();

    await tap(user, toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(dropdown()).not.toBeVisible();
  });

  it('ignores a mouse hover in the drawer, so only a tap or click opens it', async () => {
    viewport('drawer');
    const { user, toggle } = header();
    await user.hover(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('navigates and closes the drawer on a tap on an item', async () => {
    viewport('drawer');
    const { setOpen, user, toggle, item } = header();
    await tap(user, toggle);
    let prevented: boolean | undefined;
    const stopNavigation = (event: MouseEvent) => {
      // The menu's handlers have run by now. jsdom cannot navigate, so stop the default here.
      prevented = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener('click', stopNavigation);
    try {
      await tap(user, item('Map'));
    } finally {
      document.removeEventListener('click', stopNavigation);
    }

    expect(prevented).toBe(false);
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
