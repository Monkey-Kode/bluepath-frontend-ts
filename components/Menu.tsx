'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { Dispatch, SetStateAction } from 'react';

import NavDropdown from '@/components/NavDropdown';
import { footerList, headerTree, type NavNode } from '@/lib/navTree';
import scrollTo from '@/lib/scrollTo';
import type { NavigationQueryResult } from '@/sanity.types';

type NavItem = NavNode['item'];

/** One menu item's link. A legacy jump link scrolls on the homepage instead of navigating. */
function NavLink({
  item: { name, page, jumpLinkId, url },
  pathname,
  setOpen,
  className,
}: {
  item: NavItem;
  pathname: string;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  className: string;
}) {
  // Resolve the href. Priority: explicit Direct Link > page
  // reference > legacy jump link. Page references are NOT gated on
  // the `linkType` boolean any more — a referenced page always links
  // to its slug, so items left with a blank toggle (e.g. Impact)
  // route correctly instead of collapsing to `/`.
  let pageLink = '';
  if (url) {
    // Direct Link is stored as a full URL; keep only the path so
    // internal links route client-side instead of reloading.
    pageLink = new URL(url).pathname.slice(1);
  } else if (page?.slug) {
    pageLink = page.slug;
  } else if (jumpLinkId) {
    // Legacy on-page anchor (homepage only).
    pageLink = pathname === '/' ? jumpLinkId : `/${jumpLinkId}`;
  }

  if (!jumpLinkId) {
    return (
      <Link href={`/${pageLink}`} className={className}>
        {name}
      </Link>
    );
  }
  return (
    <a
      href={`${pageLink}`}
      className={className}
      onClick={(e) => {
        if (pathname === '/') {
          e.preventDefault();
          if (setOpen) setOpen(false);
          scrollTo(pageLink);
        }
      }}
    >
      {name}
    </a>
  );
}

function Menu({
  open,
  siteLocation,
  setOpen,
  navigation,
  className,
}: {
  open: boolean;
  siteLocation: 'header' | 'footer';
  setOpen?: Dispatch<SetStateAction<boolean>>;
  navigation: NavigationQueryResult;
  className?: string;
}) {
  const pathname = usePathname();
  const isHeader = siteLocation === 'header';
  // The header nests sub-items in their parent's dropdown. The footer lists them after their parent.
  const nodes: NavNode[] = isHeader
    ? headerTree(navigation)
    : footerList(navigation).map((item) => ({ item, children: [] }));

  // In the drawer, hover underlines the white text. A darker hover color would fail contrast on
  // the blue drawer (WCAG 1.4.3).
  const linkClass = twMerge(
    'cursor-pointer font-normal text-blue no-underline',
    isHeader &&
      'max-tablet:block max-tablet:py-4 max-tablet:text-[2rem] max-tablet:font-bold max-tablet:uppercase max-tablet:text-white max-tablet:no-underline max-tablet:transition-colors max-tablet:duration-300 max-tablet:hover:underline max-[576px]:!p-0 max-[576px]:text-center max-[576px]:text-[1.5rem]',
  );
  // The toggle matches the row's links. Its padding makes it at least 24 px tall (NFR-001), and
  // the negative margin keeps its text on the same line as the links. In the drawer it spans the
  // row like a block link, so it lines up with them.
  const toggleClass = twMerge(
    linkClass,
    'inline-flex -my-1 py-1 items-center gap-[0.4em] align-top max-tablet:my-0 max-tablet:flex max-tablet:w-full max-[576px]:justify-center',
  );
  // A white panel under the row on desktop. Indented lines under "Projects" in the drawer, until
  // the drawer centers its links below 576 px. Tailwind orders `max-[576px]` rules before
  // `max-tablet` ones, so a `max-[576px]` override of a `max-tablet` class never applies.
  const dropdownClass =
    'm-0 tablet:absolute tablet:top-full tablet:left-0 tablet:z-10 tablet:min-w-48 tablet:bg-white tablet:py-2 tablet:shadow-[0_4px_12px_rgba(0,0,0,0.12)] max-tablet:pb-2 min-[576px]:max-tablet:pl-6';
  // The item under the pointer or focus shows white text on blue (AC-1.1).
  const subLinkClass =
    'block min-h-6 whitespace-nowrap px-4 py-2 font-normal text-blue no-underline hover:bg-blue hover:text-white focus-visible:bg-blue focus-visible:text-white max-tablet:px-0 max-tablet:py-2 max-tablet:text-[1.5rem] max-tablet:font-bold max-tablet:uppercase max-tablet:text-white max-tablet:transition-colors max-tablet:duration-300 max-tablet:hover:bg-transparent max-tablet:hover:underline max-tablet:focus-visible:bg-transparent max-[576px]:text-center';

  return (
    <nav
      data-open={open}
      className={twMerge(
        siteLocation,
        'my-7 text-base max-[1080px]:text-[0.7rem]',
        // Slide-out drawer on mobile when used in the header
        isHeader &&
          'max-tablet:absolute max-tablet:left-0 max-tablet:top-0 max-tablet:z-[9] max-tablet:flex max-tablet:!m-0 max-tablet:h-screen max-tablet:flex-col max-tablet:justify-center max-tablet:bg-blue max-tablet:p-[8%] max-tablet:text-left max-tablet:transition-transform max-tablet:duration-300 max-tablet:ease-in-out max-tablet:-translate-x-full max-tablet:data-[open=true]:translate-x-0 max-[576px]:w-full',
        // Footer mobile spacing tweaks
        !isHeader &&
          'max-tablet:my-12 [&>ul]:pt-4 [&>ul]:pl-3 [&>ul]:items-start [&_li]:pl-0',
        className,
      )}
    >
      <ul className="m-0 flex flex-wrap tablet:justify-end max-tablet:flex-col max-tablet:justify-center">
        {nodes.map(({ item, children }) =>
          children.length ? (
            <NavDropdown
              key={item._id}
              label={item.name}
              className="relative list-none tablet:px-4"
              toggleClassName={toggleClass}
              listClassName={dropdownClass}
              onNavigate={() => setOpen?.(false)}
            >
              {children.map((child) => (
                <li key={child._id} className="list-none">
                  <NavLink
                    item={child}
                    pathname={pathname}
                    setOpen={setOpen}
                    className={subLinkClass}
                  />
                </li>
              ))}
            </NavDropdown>
          ) : (
            <li key={item._id} className="list-none tablet:px-4">
              <NavLink
                item={item}
                pathname={pathname}
                setOpen={setOpen}
                className={linkClass}
              />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

export default Menu;
