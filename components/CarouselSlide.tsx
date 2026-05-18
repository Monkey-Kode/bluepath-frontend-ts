'use client';

import React from 'react';
import classNames from 'classnames';
import styled from 'styled-components';
import intersectionObserverOptions from '@/utils/intersectionObserverOptions';
import { useInView } from 'react-intersection-observer';
import scrollTo from '@/lib/scrollTo';
import splitByNewLines from '@/utils/splitByNewLines';
import Link from 'next/link';
import type { CarouselQueryResult } from '@/sanity.types';

const StyledSlideContent = styled.div`
  min-height: 100vh;
  height: 100%;
  width: 100%;
  display: grid;
  /* justify-content: flex-end; */
  align-items: center;
  /* transform: translateY(13%); */
  .active {
    display: flex;
    justify-content: flex-start;
  }
`;

const StyledBox = styled.div`
  /* background-color: white; */
  /* border-right: var(--border-left); */
  /* padding: 1rem; */
  position: relative;
  margin-right: 4rem;
  overflow: visible;
  * {
    color: var(--blue);
  }
  @media only screen and (min-width: 700px) {
    width: var(--box-width);
  }
  @media only screen and (max-width: 480px) {
    margin: 0 auto;
  }
`;

const StyledLinks = styled.div`
  display: flex;
  justify-content: space-between;
  a {
    display: block;
    padding: 0.4rem 0;
    font-size: 0.95rem;
    @media only screen and (max-width: 480px) {
      font-size: 0.78rem;
    }
    &:first-child {
      padding-left: 1.5rem;
    }
    &:last-child {
      text-align: right;
      padding-right: 1.5rem;
    }
  }
`;
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
  let linkOne = '';
  let linkTwo = '';
  if (firstLinkId) {
    linkOne = `#${firstLinkId}`;
  } else if (firstLinkURL) {
    linkOne = `/${firstLinkURL}`;
  }
  if (secondLinkId) {
    linkTwo = `#${secondLinkId}`;
  } else if (secondLinkURL) {
    linkTwo = `/${secondLinkURL}`;
  }

  return (
    <div id={`${_id}_carousel`}>
      <StyledSlideContent
        className={classNames(`${heading}_wrapper`, 'content')}
      >
        <div
          className={classNames(
            { active: inView, inactive: !inView },
            `${heading}_wrapper`
          )}
          ref={ref}
        >
          <StyledBox className="box">
            <h2>{heading}</h2>
            <div className="wrap">
              <p>{splitByNewLines(String(content))}</p>
              <StyledLinks className="links">
                {firstLinkId === null ? (
                  <Link href={linkOne}>{firstLink}</Link>
                ) : (
                  <a
                    href={linkOne}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(linkOne);
                    }}
                  >
                    {firstLink}
                  </a>
                )}
                {secondLinkId === null ? (
                  <Link href={linkTwo}>{secondLink}</Link>
                ) : (
                  <a
                    href={linkTwo}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(linkTwo);
                    }}
                  >
                    {secondLink}
                  </a>
                )}
              </StyledLinks>
            </div>
          </StyledBox>
        </div>
      </StyledSlideContent>
    </div>
  );
}
