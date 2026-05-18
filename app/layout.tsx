import 'normalize.css';

import type { Metadata } from 'next';
import { Inter, Libre_Baskerville } from 'next/font/google';

import {
  GoogleTagManagerNoscript,
  GoogleTagManagerScript,
} from '@/components/GoogleTagManager';
import GtmRouteTracker from '@/components/GtmRouteTracker';
import StyledComponentsRegistry from '@/lib/registry';
import Providers from '@/styles/Providers';

const inter = Inter({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const baskerville = Libre_Baskerville({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-baskerville',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://bluepathfinance.com',
  ),
  title: {
    default: 'FUNDING THE DISTRIBUTED ENERGY TRANSITION',
    template: '%s',
  },
  description:
    'We finance sustainable infrastructure, including energy retrofit and new building projects. Technologies increasingly reduce, store, and generate energy where it is used. New and remodeled buildings need to satisfy tightening carbon emission standards. Financing structures must be nimble enough to capitalize on the cost and environmental savings generated.',
  openGraph: {
    type: 'website',
    siteName: 'FUNDING THE DISTRIBUTED ENERGY TRANSITION',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@BluePathFinance',
    creator: '@BluePathFinance',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${baskerville.variable}`}
    >
      <body>
        <GoogleTagManagerNoscript />
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
        <GtmRouteTracker />
        <GoogleTagManagerScript />
      </body>
    </html>
  );
}
