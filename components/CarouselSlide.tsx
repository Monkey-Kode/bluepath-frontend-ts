'use client';

import Link from 'next/link';
import classNames from 'classnames';
import { useInView } from 'react-intersection-observer';

import intersectionObserverOptions from '@/utils/intersectionObserverOptions';
import scrollTo from '@/lib/scrollTo';
import splitByNewLines from '@/utils/splitByNewLines';
import type { CarouselQueryResult } from '@/sanity.types';

export default function CarouselSlide({
  allContent,
}: {
  allContent: CarouselQueryResult[number];
}) {
  const {
    heading,
    content,
    firstLink,
    firstLinkId,
    firstLinkURL,
    secondLink,
    secondLinkId,
    secondLinkURL,
    _id,
  } = allContent;
  const { ref, inView } = useInView(intersectionObserverOptions);

  const linkOne = firstLinkId
    ? `#${firstLinkId}`
    : firstLinkURL
    ? `/${firstLinkURL}`
    : '';
  const linkTwo = secondLinkId
    ? `#${secondLinkId}`
    : secondLinkURL
    ? `/${secondLinkURL}`
    : '';

  const linkBase = 'block py-[0.4rem] text-[0.95rem] max-[480px]:text-[0.78rem]';
  const firstLinkClass = `${linkBase} pl-6`;
  const secondLinkClass = `${linkBase} pr-6 text-right`;

  return (
    <div id={`${_id}_carousel`}>
      <div
        className={classNames(
          `${heading}_wrapper`,
          'content',
          'grid h-full min-h-screen w-full items-center [&_.active]:flex [&_.active]:justify-start',
        )}
      >
        <div
          ref={ref}
          className={classNames(
            { active: inView, inactive: !inView },
            `${heading}_wrapper`,
          )}
        >
          <div className="box relative mr-16 overflow-visible [&_*]:text-blue min-[700px]:w-[var(--box-width)] max-[480px]:m-0 max-[480px]:mx-auto">
            <h2>{heading}</h2>
            <div className="wrap">
              <p>{splitByNewLines(String(content))}</p>
              <div className="links flex justify-between">
                {firstLinkId === null ? (
                  <Link href={linkOne} className={firstLinkClass}>
                    {firstLink}
                  </Link>
                ) : (
                  <a
                    href={linkOne}
                    className={firstLinkClass}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(linkOne);
                    }}
                  >
                    {firstLink}
                  </a>
                )}
                {secondLinkId === null ? (
                  <Link href={linkTwo} className={secondLinkClass}>
                    {secondLink}
                  </Link>
                ) : (
                  <a
                    href={linkTwo}
                    className={secondLinkClass}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(linkTwo);
                    }}
                  >
                    {secondLink}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
