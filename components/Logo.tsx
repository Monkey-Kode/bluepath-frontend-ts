'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MouseEvent } from 'react';

import DarkLogo from '@/assets/dark-logo336.svg';
import LightLogo from '@/assets/light-logo.svg';
import scrollTo from '@/lib/scrollTo';

interface LogoProps {
  image: unknown;
  className: 'light-logo' | 'dark-logo';
}

function Logo({ image, className }: LogoProps) {
  const pathname = usePathname();

  if (!image) {
    return null;
  }

  const LogoComponent = className === 'light-logo' ? LightLogo : DarkLogo;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      scrollTo('#tof');
    }
  };

  return (
    <Link className={className} href="/#tof" onClick={handleClick}>
      <LogoComponent className="no-pixel" />
    </Link>
  );
}

export default Logo;
