import type { GatsbyConfig } from 'gatsby';
require('dotenv').config({
  // path: `.env.${process.env.NODE_ENV}`,
  path: `.env`,
});

const config: GatsbyConfig = {
  siteMetadata: {
    title: 'FUNDING THE DISTRIBUTED ENERGY TRANSITION',
    description:
      'We finance sustainable infrastructure, including energy retrofit and new building projects. Technologies increasingly reduce, store, and generate energy where it is used. New and remodeled buildings need to satisfy tightening carbon emission standards. Financing structures must be nimble enough to capitalize on the cost and environmental savings generated.',
    siteUrl: 'https://bluepathfinance.com',
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  trailingSlash: 'always',
  plugins: [
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: process.env.SANITY_PROJECT_ID,
        dataset: process.env.SANITY_DATASET,
        token: process.env.SANITY_TOKEN,
        watchMode: true,
      },
    },
    'gatsby-plugin-styled-components',
    'gatsby-plugin-image',
    'gatsby-plugin-sitemap',
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        icon: 'src/images/favicon.png',
      },
    },
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'images',
        path: './src/images/',
      },
      __key: 'images',
    },
    `gatsby-plugin-smoothscroll`,
    {
      resolve: 'gatsby-plugin-react-svg',
      options: {
        rule: {
          include: /src\/images\/.*\.svg/,
        },
      },
    },
    {
      resolve: 'gatsby-plugin-google-tagmanager',
      options: {
        id: 'GTM-5BVGJ4Q',
        includeInDevelopment: true,
      },
    },
  ],
};

export default config;
