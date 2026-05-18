import type { Metadata } from 'next';

import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import ThankYouContent from './ThankYouContent';

export const metadata: Metadata = {
  title: 'Thank You',
};

export default function ThankYouPage() {
  return (
    <>
      <SiteHeader />
      <ThankYouContent />
      <SiteFooter />
    </>
  );
}
