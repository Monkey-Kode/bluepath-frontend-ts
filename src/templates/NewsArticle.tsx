import React from 'react';
import { graphql, HeadProps, PageProps } from 'gatsby';
import styled from 'styled-components';
import { GatsbyImage, getImage, type IGatsbyImageData } from 'gatsby-plugin-image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import NewsBody from '../components/NewsBody';
import BluePathLogo from '../images/dark-logo336.svg';
import { headerOffset } from '../styles/mixins';

type NewsArticleData = {
  article: {
    title?: string | null;
    subhead?: string | null;
    publication?: string | null;
    publishedAt?: string | null;
    excerpt?: string | null;
    seoDescription?: string | null;
    slug?: { current?: string | null } | null;
    heroImage?: {
      asset?: {
        gatsbyImageData?: IGatsbyImageData | null;
        url?: string | null;
      } | null;
    } | null;
    _rawBody?: unknown;
  } | null;
};

const StyledArticle = styled.main`
  background: #fff;
  color: #000;
  ${headerOffset}
  padding-bottom: 5rem;
  padding-inline: 1.25rem;

  .article-wrap {
    max-width: 800px;
    margin: 0 auto;
  }

  .brand-mark {
    margin: 0 0 2rem;
    svg,
    img {
      display: block;
      max-width: 168px;
      height: auto;
    }
  }

  h1 {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: #000;
    font-size: var(--text-h1);
    line-height: 1.2;
    margin: 0 0 1.5rem;
    text-wrap: balance;
  }

  figure.hero {
    margin: 0 0 1rem;
    .gatsby-image-wrapper,
    img {
      width: 100%;
      height: auto;
      display: block;
    }
  }

  .date-stamp {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 1.5rem 0 2rem;
    display: block;
  }
`;

function NewsArticle({
  data: { article },
  location,
}: PageProps<NewsArticleData>) {
  const hero = article?.heroImage?.asset?.gatsbyImageData
    ? getImage(article.heroImage.asset.gatsbyImageData)
    : null;
  const publishedAt = article?.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : null;

  return (
    <div className="news">
      <Header location={location} />
      <StyledArticle>
        <article className="article-wrap">
          <div className="brand-mark" aria-label="BluePath Finance">
            <BluePathLogo />
          </div>
          {article?.title && <h1>{article.title}</h1>}
          {hero && (
            <figure className="hero">
              <GatsbyImage image={hero} alt={article?.title ?? 'Article hero image'} />
            </figure>
          )}
          {publishedAt && <time className="date-stamp">{publishedAt}</time>}
          {article?._rawBody ? <NewsBody value={article._rawBody} /> : null}
        </article>
      </StyledArticle>
      <Footer location={location} />
    </div>
  );
}

export const Head = ({
  data: { article },
  location,
}: HeadProps<NewsArticleData>) => {
  const title = article?.title ?? 'News';
  const description = article?.seoDescription ?? article?.excerpt ?? undefined;
  const ogImage = article?.heroImage?.asset?.url ?? undefined;
  return (
    <SEO
      title={title}
      description={description ?? undefined}
      image={ogImage ?? undefined}
      location={location as Location}
    >
      <meta property="og:type" content="article" />
      {article?.publishedAt && (
        <meta
          property="article:published_time"
          content={new Date(article.publishedAt).toISOString()}
        />
      )}
    </SEO>
  );
};

export const query = graphql`
  query NewsArticle($slug: String!) {
    article: sanityNews(slug: { current: { eq: $slug } }) {
      title
      subhead
      publication
      publishedAt
      excerpt
      seoDescription
      slug {
        current
      }
      heroImage {
        asset {
          gatsbyImageData(width: 1440, layout: CONSTRAINED, placeholder: BLURRED)
          url
        }
      }
      _rawBody(resolveReferences: { maxDepth: 4 })
    }
  }
`;

export default NewsArticle;
