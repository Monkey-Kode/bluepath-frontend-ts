import React, { forwardRef } from "react";
// import Logo from './Logo';
import { graphql, useStaticQuery } from "gatsby";
import styled from "styled-components";
import sortObject from "../utils/sortObject";
import splitByNewLines from "../utils/splitByNewLines";
import Menu from "./Menu";
import DarkLogo from "../images/dark-logo336.svg";

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
    border-left: 4px solid var(--orange);
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
          /* border-right: var(--border-right) */
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
type FooterProps = {
  location?: Location | null | undefined;
};

const Footer = forwardRef<HTMLDivElement, FooterProps>(function Footer(
  { location },
  ref,
) {
  const { allSanityAddress }: Queries.FooterQuery = useStaticQuery(graphql`
    query Footer {
      allSanityAddress {
        nodes {
          name
          address
          id
          order
          location {
            lat
            lng
            alt
          }
          details
        }
      }
    }
  `);

  const addressesOrdered = sortObject(
    allSanityAddress.nodes,
  ) as Queries.FooterQuery["allSanityAddress"]["nodes"];

  return (
    <FooterStyles ref={ref}>
      <div className="footer-logo">
        <DarkLogo style={{ maxWidth: "300px", margin: "0 auto" }} />
      </div>
      <div className="wrap">
        {addressesOrdered.map(({ name, address, id, order, details }) => {
          return (
            <div className="address" key={id}>
              <address>{splitByNewLines(String(details))}</address>
            </div>
          );
        })}
      </div>
      <Menu open={false} location={location} siteLocation="footer" />
    </FooterStyles>
  );
});

export default Footer;
