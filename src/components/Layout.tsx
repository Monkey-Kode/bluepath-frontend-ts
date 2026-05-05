import React from 'react';
import GlobalStyles from '../styles/GlobalStyles';
import Typography from '../styles/Typography';
import TypographyBase from '../styles/TypographyBase';
import MapStyles from '../styles/MapStyles';
export const Layout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <>
      <TypographyBase />
      <GlobalStyles />
      <Typography />
      <MapStyles />
      {children}
    </>
  );
};
