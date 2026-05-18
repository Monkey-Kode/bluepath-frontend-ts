'use client';

import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import styled from 'styled-components';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import HomeMain from '@/components/HomeMain';
import type {
  AddressesQueryResult,
  CarouselQueryResult,
  CasestudiesQueryResult,
  HomesectionsQueryResult,
  HomevideoQueryResult,
  NavigationQueryResult,
  SettingsQueryResult,
  TeamQueryResult,
} from '@/sanity.types';

const StyledHeaderWrapper = styled.div`
  z-index: 100;
  header {
    background-color: transparent;
    box-shadow: none;
    .burger-menu {
      div {
        background-color: white;
      }
    }
    .dark-logo {
      display: none;
    }
    .light-logo {
      display: block;
    }
    nav ul li a {
      color: #fff;
      font-weight: 100;
    }
    &.show {
      background-color: var(--white);
      .burger-menu:not(.open) {
        div {
          background-color: var(--blue);
        }
      }
      .dark-logo {
        display: block;
      }
      .light-logo {
        display: none;
      }
      @media only screen and (min-width: 800px) {
        nav ul li a {
          color: var(--blue);
          font-weight: 400;
        }
      }
    }
  }
`;

export default function HomeView({
  settings,
  navigation,
  addresses,
  sections,
  caseStudies,
  videos,
  slides,
  team,
}: {
  settings: SettingsQueryResult;
  navigation: NavigationQueryResult;
  addresses: AddressesQueryResult;
  sections: HomesectionsQueryResult;
  caseStudies: CasestudiesQueryResult;
  videos: HomevideoQueryResult;
  slides: CarouselQueryResult;
  team: TeamQueryResult;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const footerRef = useInView({ threshold: 0.5 });

  useEffect(() => {
    const handleScroll = () => {
      const header = ref?.current?.querySelector('header');
      if (window.scrollY > 0) {
        header?.classList.remove('hide');
        header?.classList.add('show');
      } else {
        header?.classList.remove('show');
        header?.classList.add('hide');
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="home">
      <StyledHeaderWrapper ref={ref}>
        <Header settings={settings} navigation={navigation} />
      </StyledHeaderWrapper>
      <HomeMain
        footerRef={footerRef}
        sections={sections}
        caseStudies={caseStudies}
        videos={videos}
        slides={slides}
        team={team}
      />
      <div ref={footerRef.ref}>
        <Footer addresses={addresses} navigation={navigation} />
      </div>
    </div>
  );
}
