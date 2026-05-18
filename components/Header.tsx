'use client';

import { useEffect, useRef } from 'react';
import styled from 'styled-components';

import Logo from '@/components/Logo';
import Nav from '@/components/Nav';
import type { NavigationQueryResult, SettingsQueryResult } from '@/sanity.types';

const StyledHeader = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  background-color: var(--white);
  transition: background-color 0.24s ease-in-out;
  z-index: 10000;
  padding-block: 20px;
  padding-left: 7%;
  padding-right: 7%;
  @media (min-width: 800px) {
    .wrap {
      display: grid;
      grid-template-columns: 1fr 2fr;
    }
  }
`;

const LogoWrap = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-flow: row nowrap;

  > * {
    flex: 1 auto;
    max-width: 168px;
  }

  @media (max-width: 799px) {
    padding: 1rem 2rem 1rem 1.5rem;
    justify-content: flex-start;
    text-align: left;
  }
  @media (max-width: 375px) {
    padding: 1rem 0;
    a {
      max-width: 168px;
    }
  }
`;

function Header({
  settings,
  navigation,
}: {
  settings: SettingsQueryResult;
  navigation: NavigationQueryResult;
}) {
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = headerRef.current;
    if (!node || typeof window === 'undefined') return;
    const setHeight = () => {
      const h = node.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(node);
    window.addEventListener('resize', setHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setHeight);
    };
  }, []);

  return (
    <StyledHeader ref={headerRef}>
      <div className="wrap">
        <LogoWrap>
          <Logo className="dark-logo" image={settings?.logoDark} />
          <Logo className="light-logo" image={settings?.logoLight} />
        </LogoWrap>
        <Nav navigation={navigation} />
      </div>
    </StyledHeader>
  );
}

export default Header;
