'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import { loader } from '@/lib/mapsLoader';
import sortObject from '@/utils/sortObject';
import splitByNewLines from '@/utils/splitByNewLines';
import type {
  AddressesQueryResult,
  PageBySlugQueryResult,
} from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

const emailLink = '/bluepath-email-link.png';

const StyledContentArea = styled.div`
  display: grid !important;
  grid-template-columns: 90vw;
  grid-template-rows: 150px repeat(2, 700px);
  grid-gap: 30px;
  justify-content: center;
  align-items: flex-start !important;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
  a {
    color: white;
    font-weight: 700;
    text-decoration: underline;
  }
  @media only screen and (min-width: 1200px) {
    grid-template-columns: auto repeat(2, 430px);
    grid-template-rows: auto;
    max-width: 80vw;
    align-items: center !important;
  }
  @media only screen and (min-width: 1129px) and (max-width: 1200px) {
    padding-top: 20%;
  }
  @media only screen and (min-width: 800px) and (max-width: 1128px) {
    padding-top: 30%;
  }
  @media only screen and (max-width: 600px) {
    padding-top: 0%;
  }
`;
const StyledColumns = styled.div`
  max-width: 430px;
  margin: 0;

  @media only screen and (max-width: 600px) {
    max-width: calc(100vw - 20px);
    max-height: calc(calc(calc(100% - 20px) * 330px) / 430px);
  }

  h3 {
    background-color: var(--blue);
    color: white;
    font-size: 2rem;
    padding: 1rem 1.5rem;
    margin-bottom: 0;
    letter-spacing: 1.3px;
    text-transform: uppercase;
  }
  p {
    color: white;
    font-weight: 100;
    font-size: 1.3rem;
    padding: 1.24rem;
    margin: 0;
    line-height: 1.3;
  }

  .details {
    opacity: 0;
    transition: opacity 0.24s ease-out;
    background-color: var(--gray);
    height: 100%;
    &.active {
      opacity: 1;
      transition: opacity 0.24s ease-out;
    }
  }
`;
const StyledMap = styled.div`
  width: 430px;
  height: 330px;
  @media only screen and (max-width: 600px) {
    max-width: 100%;
    max-height: calc(calc(calc(100% - 20px) * 330px) / 430px);
  }
`;

export const ContactBody = ({
  id,
  Heading,
  name,
  richcontent,
  addresses,
}: {
  id: Page['id'];
  Heading: Page['Heading'];
  name: Page['name'];
  richcontent: Page['richcontent'];
  addresses: AddressesQueryResult;
}) => {
  const orderedAddresses = sortObject(addresses);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    loader.load().then(() => {
      const googleMaps = window.google.maps;
      const map: Record<number, google.maps.Map> = [];

      orderedAddresses.forEach(({ _id, location: center }) => {
        if (googleMaps && document.getElementById(String(_id)) !== null) {
          map[Number(_id)] = new window.google.maps.Map(
            document.getElementById(String(_id)) as HTMLElement,
            {
              center: center as unknown as google.maps.LatLngLiteral,
              zoom: 12,
            },
          );
        }
      });
    });
  }, [orderedAddresses]);

  return (
    <StyledContentArea>
      <div style={{ minWidth: '255px' }}>
        <h1>{Heading || name}</h1>
        {richcontent?.map((content) =>
          content?.children?.map((c) => <p key={id}>{c?.text}</p>),
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            window.open('mailto:info@bluepathfinance.com');
          }}
          style={{
            transform: 'translate(-13px, -30px)',
            cursor: 'pointer',
            padding: '0',
            background: 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={emailLink} alt="Bluepath contact email" />
        </button>
      </div>
      {orderedAddresses.map(({ _id, details, address }) => {
        return (
          <StyledColumns
            key={_id}
            onClick={() => setShowInfo(Boolean(_id))}
            onMouseEnter={() => setShowInfo(Boolean(_id))}
            onMouseLeave={() => setShowInfo(false)}
          >
            <h3>{splitByNewLines(String(address))}</h3>
            <StyledMap id={_id ?? undefined}></StyledMap>
            <div
              className={classNames('details', {
                active: showInfo === Boolean(_id),
              })}
            >
              <p>{splitByNewLines(String(details))}</p>
            </div>
          </StyledColumns>
        );
      })}
    </StyledContentArea>
  );
};
