import type { Metadata } from 'next';

import NotFoundContent from '@/app/NotFoundContent';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Page Not Found · BluePath Finance',
  description: 'The page you’re looking for doesn’t exist.',
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundContent />
      <SiteFooter />
    </>
  );
}
