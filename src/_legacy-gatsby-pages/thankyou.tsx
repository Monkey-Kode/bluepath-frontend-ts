import React from 'react';
import styled from 'styled-components';
import Footer from '../components/Footer';
import Header from '../components/Header';
import type { PageProps } from 'gatsby';

const StyledMain = styled.main`
  margin: 200px auto 0;
  max-width: 1200px;
  h1,
  p {
    color: black;
  }
`;
function ThankYou({ location }: PageProps) {
  return (
    <>
      <Header location={location} />
      <StyledMain>
        <h1>Thank you for your interest!</h1>
        <p>We will get back to you shortly.</p>
      </StyledMain>
      <Footer location={location} />
    </>
  );
}
export default ThankYou;
