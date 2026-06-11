import './globals.css';

import type { Metadata } from 'next';
import { Urbanist } from 'next/font/google';
import { draftMode } from 'next/headers';
import { VisualEditing } from 'next-sanity/visual-editing';
import { Toaster } from 'sonner';

import { handleError } from '@/app/client-utils';
import DraftModeToast from '@/components/DraftModeToast';
import { getSiteUrl } from '@/lib/siteUrl';
import { SanityLive } from '@/sanity/lib/live';

const urbanist = Urbanist({
  weight: ['300', '400', '500', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--font-urbanist',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <html lang="en" className={urbanist.variable}>
      <body>
        {children}
        <Toaster />
        {isDraftMode && (
          <>
            <DraftModeToast />
            <VisualEditing />
          </>
        )}
        {/* SanityLive drives live revalidation for every sanityFetch — always rendered. */}
        <SanityLive onError={handleError} />
      </body>
    </html>
  );
}
