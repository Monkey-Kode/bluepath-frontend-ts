'use client';

import { Dispatch, SetStateAction } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

const StyledBurger = styled.button<{ $open: boolean }>`
  display: none;
  @media (max-width: 800px) {
    position: absolute;
    top: calc(153px / 2 - 2rem);
    right: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    width: 2rem;
    height: 1.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    z-index: 10;

    &:focus {
      outline: none;
    }

    div {
      width: 2rem;
      height: 0.17rem;
      background: ${({ $open }) => ($open ? 'white' : 'var(--blue)')};
      border-radius: 10px;
      transition: all 0.3s linear;
      position: relative;
      transform-origin: 1px;

      :first-child {
        transform: ${({ $open }) =>
          $open ? 'rotate(45deg) translate(0, -6px)' : 'rotate(0)'};
      }

      :nth-child(2) {
        opacity: ${({ $open }) => ($open ? '0' : '1')};
        transform: ${({ $open }) =>
          $open ? 'translateX(20px)' : 'translateX(0)'};
      }

      :nth-child(3) {
        transform: ${({ $open }) =>
          $open ? 'rotate(-45deg) translate(2px, 3px)' : 'rotate(0)'};
      }
    }
  }
`;

function BurgerMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <StyledBurger
      className={classNames({ open }, 'burger-menu')}
      $open={open}
      onClick={() => setOpen(!open)}
    >
      <div />
      <div />
      <div />
    </StyledBurger>
  );
}

export default BurgerMenu;
