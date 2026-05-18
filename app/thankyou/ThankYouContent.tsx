'use client';

import styled from 'styled-components';

const StyledMain = styled.main`
  margin: 200px auto 0;
  max-width: 1200px;
  h1,
  p {
    color: black;
  }
`;

export default function ThankYouContent() {
  return (
    <StyledMain>
      <h1>Thank you for your interest!</h1>
      <p>We will get back to you shortly.</p>
    </StyledMain>
  );
}
