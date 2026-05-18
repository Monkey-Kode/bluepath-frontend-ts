'use client';

import styled from 'styled-components';
const BlueBox = styled.button`
  appearance: none;
  cursor: pointer;
  background: var(--blueRGB);
  border: 1px solid white;
  border-radius: 8px;
  padding: 1rem;
  transition: opacity 0.4s ease-out;
  margin: 0 auto;
  opacity: 0.5;
  .btn-active & {
    opacity: 1;
    border-color: var(--accent);
    transition: opacity 0.4s ease-out;
  }
  .btn-inactive & {
    transition: opacity 0.4s ease-out;
  }
  > * {
    color: white;
    text-align: center;
    text-transform: uppercase;
    pointer-events: none;
  }
  p {
    font-size: 0.55rem;
    margin-bottom: 0;
  }
  h3 {
    font-size: 1rem;
    margin-bottom: 0.4rem;
  }

  @media only screen and (max-width: 800px) {
    &:not(.thumb) {
      display: flex;
      align-items: center;
      flex-flow: column nowrap;
      justify-content: flex-start;
      > * {
        flex: 1 100%;
      }
    }
    h2 {
      margin-top: 0.75rem;
    }

    h3 {
      margin-bottom: 0.3rem;
    }

    p {
      margin-bottom: 0;
      font-size: 2.5vw !important;
    }
  }
`;

export default BlueBox;
