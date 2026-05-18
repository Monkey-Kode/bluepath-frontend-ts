'use client';

import { ThemeProvider } from 'styled-components';

import GlobalStyles from '@/styles/GlobalStyles';
import { theme } from '@/styles/Theme';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}
