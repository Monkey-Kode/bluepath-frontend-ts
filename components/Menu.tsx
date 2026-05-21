'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';
import { Dispatch, SetStateAction } from 'react';

import scrollTo from '@/lib/scrollTo';
import sortObject from '@/utils/sortObject';
import type { NavigationQueryResult } from '@/sanity.types';

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
  const navItems = sortObject(navigation);

  const isHeader = siteLocation === 'header';

  const linkClass = classNames(
    'cursor-pointer font-normal text-blue no-underline',
    isHeader &&
      'max-tablet:block max-tablet:py-4 max-tablet:text-[2rem] max-tablet:font-bold max-tablet:uppercase max-tablet:tracking-[0.5rem] max-tablet:text-white max-tablet:no-underline max-tablet:transition-colors max-tablet:duration-300 max-tablet:hover:text-[#343078] max-[576px]:!p-0 max-[576px]:text-center max-[576px]:text-[1.5rem]',
  );

  return (
    <nav
      data-open={open}
      className={classNames(
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
        {navItems.map(
          ({
            name: title,
            page,
            jumpLinkId,
            linkType,
            _id,
            header,
            footer,
            url,
          }) => {
            if (!header && isHeader) return null;
            if (!footer && !isHeader) return null;

            let pageLink = '';
            if (page !== null && linkType === false && !!page.slug) {
              pageLink = page.slug ?? '';
            } else if (pathname !== '/') {
              pageLink = `/${jumpLinkId}`;
            } else {
              pageLink = jumpLinkId ?? '';
            }
            if (url) {
              const link = new URL(url);
              pageLink = link.pathname.slice(1);
            }

            return (
              <li key={_id} className="list-none tablet:px-4">
                {!jumpLinkId ? (
                  <Link href={`/${pageLink}`} className={linkClass}>
                    {title}
                  </Link>
                ) : (
                  <a
                    href={`${pageLink}`}
                    className={linkClass}
                    onClick={(e) => {
                      if (pathname === '/') {
                        e.preventDefault();
                        if (setOpen) setOpen(false);
                        scrollTo(pageLink);
                      }
                    }}
                  >
                    {title}
                  </a>
                )}
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}

export default Menu;
