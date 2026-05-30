'use client';

import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

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
      <div ref={ref} className="header-overlay z-[100]">
        <Header settings={settings} navigation={navigation} />
      </div>
      <HomeMain
        footerRef={footerRef}
        sections={sections}
        caseStudies={caseStudies}
        videos={videos}
        slides={slides}
        team={team}
      />
      <div ref={footerRef.ref}>
        <Footer
          addresses={addresses}
          navigation={navigation}
          settings={settings}
        />
      </div>
    </div>
  );
}
