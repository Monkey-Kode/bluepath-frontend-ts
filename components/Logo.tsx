'use client';

import Link from 'next/link';

import DarkLogo from '@/assets/dark-logo336.svg';
import LightLogo from '@/assets/light-logo.svg';

interface LogoProps {
  image: unknown;
  className: 'light-logo' | 'dark-logo';
}

function Logo({ image, className }: LogoProps) {
  if (!image) {
    return null;
  }

  const LogoComponent = className === 'light-logo' ? LightLogo : DarkLogo;

  return (
    // Object href (pathname + hash) builds the URL from parts rather than
    // string-appending, which avoids Next's intermittent same-page `#tof#tof`.
    <Link className={className} href={{ pathname: '/', hash: 'tof' }}>
      <LogoComponent className="no-pixel" />
    </Link>
  );
}

export default Logo;
