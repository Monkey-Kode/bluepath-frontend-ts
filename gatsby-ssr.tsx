import React from 'react';
import { Layout } from './src/components/Layout';
import type { GatsbySSR } from 'gatsby';
import { typographyStyles } from './src/utils/typography';

export const onRenderBody: GatsbySSR['onRenderBody'] = ({
  setHeadComponents,
}) => {
  setHeadComponents([
    <style
      key="typography.js"
      id="typography.js"
      dangerouslySetInnerHTML={{ __html: typographyStyles }}
    />,
  ]);
};

export const wrapPageElement: GatsbySSR['wrapPageElement'] = ({
  element,
  props,
}) => <Layout {...props}>{element}</Layout>;
