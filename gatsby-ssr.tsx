import React from 'react';
import { Layout } from './src/components/Layout';
import type { GatsbySSR } from 'gatsby';

export const wrapPageElement: GatsbySSR['wrapPageElement'] = ({
  element,
  props,
}) => <Layout {...props}>{element}</Layout>;
