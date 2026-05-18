'use client';

import styled from 'styled-components';

import DarkLogo from '@/assets/dark-logo336.svg';
import Menu from '@/components/Menu';
import splitByNewLines from '@/utils/splitByNewLines';
import sortObject from '@/utils/sortObject';
import type {
  AddressesQueryResult,
  NavigationQueryResult,
} from '@/sanity.types';

const FooterStyles = styled.footer`
  background-color: var(--surface-muted);
  align-items: center;

  width: 100vw;
  overflow: hidden;
  padding: 4vw 2vw;
  @media only screen and (max-width: 800px) {
    padding: 7vw 5vw;
  }
  h2 {
    margin: 0;
    text-transform: uppercase;
    font-weight: 400;
  }
  address {
    font-style: normal;
    line-height: 1.3;
  }
  .gatsby-image-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 400px;
    margin: 0 auto;
  }
  .address {
    border-left: 4px solid var(--accent);
    padding-left: 10px;
  }

  .footer-logo {
    @media only screen and (min-width: 801px) {
      text-align: right;
      margin-right: 20%;
    }
    @media only screen and (max-width: 800px) {
      display: none;
    }
  }

  address,
  p,
  h2 {
    color: var(--blue);
  }

  nav {
    ul {
      justify-content: center;
      align-items: center;
      li {
        padding: 0 1em;
        &:not(:last-child) {
        }
        a {
          font-size: 0.8rem;
        }
      }
    }
  }

  @media (min-width: 800px) {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto;

    a {
      grid-column: 1/2;
      grid-row: 1/2;
    }
    .wrap {
      grid-column: 2/3;
      grid-row: 1/2;
    }
    nav {
      grid-column: 1/3;
      grid-row: 2/3;
    }
  }
  @media only screen and (max-width: 800px) {
    .gatsby-image-wrapper {
      margin-bottom: 3em;
    }
  }
`;

function Footer({
  addresses,
  navigation,
}: {
  addresses: AddressesQueryResult;
  navigation: NavigationQueryResult;
}) {
  const addressesOrdered = sortObject(addresses);

  return (
    <FooterStyles>
      <div className="footer-logo">
        <DarkLogo style={{ maxWidth: '300px', margin: '0 auto' }} />
      </div>
      <div className="wrap">
        {addressesOrdered.map(({ _id, details }) => (
          <div className="address" key={_id}>
            <address>{splitByNewLines(String(details))}</address>
          </div>
        ))}
      </div>
      <Menu open={false} siteLocation="footer" navigation={navigation} />
    </FooterStyles>
  );
}

export default Footer;
