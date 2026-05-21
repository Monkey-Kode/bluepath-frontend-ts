'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import DarkLogo from '@/assets/dark-logo336.svg';
import LightLogo from '@/assets/light-logo.svg';

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

  return (
    <Link className={className} href="/#tof">
      <LogoComponent className="no-pixel" />
    </Link>
  );
}

export default Logo;
