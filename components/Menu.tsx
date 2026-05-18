'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dispatch, SetStateAction } from 'react';
import styled from 'styled-components';

import scrollTo from '@/lib/scrollTo';
import sortObject from '@/utils/sortObject';
import type { NavigationQueryResult } from '@/sanity.types';

const StyledMenu = styled.nav<{ $open: boolean }>`
  margin: 1.75rem 0;
  font-size: 1rem;
  @media (max-width: 1080px) {
    font-size: 0.7rem;
  }
  @media (max-width: 800px) {
    &.header {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: var(--blue);
      transform: ${({ $open }) =>
        $open ? 'translateX(0)' : 'translateX(-100%)'};
      height: 100vh;
      text-align: left;
      padding: 8%;
      position: absolute;
      top: 0;
      left: 0;
      transition: transform 0.3s ease-in-out;
      z-index: 9;
      margin: 0 !important;

      @media (max-width: 576px) {
        width: 100%;
      }

      a {
        font-size: 2rem;
        text-transform: uppercase;
        padding: 1rem 0;
        font-weight: bold;
        letter-spacing: 0.5rem;
        color: white;
        text-decoration: none;
        transition: color 0.3s linear;

        @media (max-width: 576px) {
          font-size: 1.5rem;
          text-align: center;
          padding: 0 !important;
        }

        &:hover {
          color: #343078;
        }
      }
    }
    &.footer {
      margin: 3rem 0 1rem;
      ul {
        padding-top: 1rem;
        padding-left: 0.7rem;
        align-items: flex-start;

        li {
          padding-left: 0;
          border: none !important;
        }
      }
    }
  }
`;

const StyledMenuUl = styled.ul`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  @media (min-width: 800px) {
    justify-content: flex-end;
  }
  @media (max-width: 799px) {
    flex-direction: column;
    justify-content: center;
  }

  li {
    list-style: none;
    @media (min-width: 800px) {
      padding: 0 1rem 0;
    }
    a {
      text-decoration: none;
      text-transform: uppercase;
      font-weight: 400;
      cursor: pointer;
    }
  }
`;

function Menu({
  open,
  siteLocation,
  setOpen,
  navigation,
}: {
  open: boolean;
  siteLocation: string;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  navigation: NavigationQueryResult;
}) {
  const pathname = usePathname();
  const navItems = sortObject(navigation);

  return (
    <StyledMenu className={siteLocation} $open={open}>
      <StyledMenuUl>
        {navItems.map(
          ({ name: title, page, jumpLinkId, linkType, _id, header, footer, url }) => {
            if (!header && siteLocation === 'header') {
              return null;
            }
            if (!footer && siteLocation === 'footer') {
              return null;
            }

            let pageLink = '';

            if (page !== null && linkType === false && !!page.slug) {
              pageLink = page.slug ?? '';
            } else {
              if (pathname !== '/') {
                pageLink = `/${jumpLinkId}`;
              } else {
                pageLink = jumpLinkId ?? '';
              }
            }
            if (url) {
              const link = new URL(url);
              pageLink = link.pathname.slice(1);
            }

            return (
              <li key={_id}>
                {!jumpLinkId ? (
                  <Link href={`/${pageLink}`}>{title}</Link>
                ) : (
                  <a
                    href={`${pageLink}`}
                    onClick={(e) => {
                      if (pathname === '/') {
                        e.preventDefault();
                        if (setOpen) {
                          setOpen(false);
                        }
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
      </StyledMenuUl>
    </StyledMenu>
  );
}

export default Menu;
