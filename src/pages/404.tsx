import React from 'react';
import { Link, type HeadFC, type PageProps } from 'gatsby';
import styled from 'styled-components';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { headerOffset } from '../styles/mixins';

const StyledNotFound = styled.main`
  background: #fff;
  color: var(--blue);
  ${headerOffset}
  padding-bottom: 5rem;
  padding-inline: 1.25rem;
  min-height: calc(100vh - var(--header-height, 100px));
  display: flex;
  align-items: center;
  justify-content: center;

  .wrap {
    max-width: 720px;
    margin: 0 auto;
    text-align: center;
  }

  .code {
    font-family: 'Lora', Georgia, serif;
    font-weight: 700;
    color: var(--blue);
    font-size: clamp(5rem, 14vw, 10rem);
    line-height: 1;
    margin: 0 0 0.5rem;
  }

  .divider {
    width: 4rem;
    height: 1px;
    background: var(--orange);
    margin: 1rem auto 1.5rem;
    border: 0;
  }

  h1 {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    line-height: 1.2;
    margin: 0 0 1rem;
  }

  p {
    font-family: 'Lora', Georgia, serif;
    color: #000;
    font-size: 1rem;
    line-height: 1.6;
    margin: 0 0 2rem;
  }

  .cta {
    display: inline-block;
    background: var(--blue);
    color: #fff;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.8125rem;
    font-weight: 400;
    text-decoration: none;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--orange);
      color: #fff;
    }
  }
`;

const NotFoundPage = ({ location }: PageProps) => (
  <div>
    <Header location={location} />
    <StyledNotFound>
      <div className="wrap">
        <p className="code">404</p>
        <hr className="divider" aria-hidden="true" />
        <h1>Page Not Found</h1>
        <p>
          The page you’re looking for doesn’t exist or may have moved. Try
          heading back to the homepage, or visit our News &amp; Events to see
          what we’ve been up to.
        </p>
        <Link to="/" className="cta">
          BACK TO HOME
        </Link>
      </div>
    </StyledNotFound>
    <Footer location={location} />
  </div>
);

export const Head: HeadFC = () => (
  <SEO
    title="Page Not Found · BluePath Finance"
    description="The page you’re looking for doesn’t exist."
  />
);

export default NotFoundPage;
