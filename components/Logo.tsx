'use client';

import Link from 'next/link';

import DarkLogo from '@/assets/dark-logo336.svg';
import LightLogo from '@/assets/light-logo.svg';
import SanityImage from '@/components/SanityImage';
import type { SettingsQueryResult } from '@/sanity.types';

type LogoImage = NonNullable<SettingsQueryResult>['logoDark'];

interface LogoProps {
  image?: LogoImage;
  className: 'light-logo' | 'dark-logo';
}

function Logo({ image, className }: LogoProps) {
  // Logos come from siteSettings (logoLight / logoDark). The bundled SVGs are
  // kept only as a fallback for when the CMS image is missing.
  const FallbackLogo = className === 'light-logo' ? LightLogo : DarkLogo;

  return (
    // Object href (pathname + hash) builds the URL from parts rather than
    // string-appending, which avoids Next's intermittent same-page `#tof#tof`.
    <Link className={className} href={{ pathname: '/', hash: 'tof' }}>
      {image?.asset?._id ? (
        <SanityImage
          image={image}
          alt={image.alt || 'Bluepath'}
          width={336}
          className="no-pixel h-auto w-full"
        />
      ) : (
        <FallbackLogo className="no-pixel" />
      )}
    </Link>
  );
}

export default Logo;
