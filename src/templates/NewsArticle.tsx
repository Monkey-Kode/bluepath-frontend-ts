import React from 'react';
import { graphql, HeadProps, PageProps } from 'gatsby';
import styled from 'styled-components';
import { GatsbyImage, getImage, type IGatsbyImageData } from 'gatsby-plugin-image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import NewsBody from '../components/NewsBody';

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
  color: var(--blue);
  padding: calc(var(--mobile-header-height) + 1.5rem) 1.25rem 5rem;

  @media (min-width: 800px) {
    padding-top: 160px;
  }

  .article-wrap {
    max-width: 720px;
    margin: 0 auto;
  }

  .brand-mark {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.75rem;
    color: var(--blue);
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .publication {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.8125rem;
    color: var(--gray2);
    margin-bottom: 0.75rem;
  }

  h1 {
    font-family: 'Lora', Georgia, serif;
    font-weight: 500;
    color: var(--blue);
    font-size: clamp(2rem, 4vw, 2.75rem);
    line-height: 1.2;
    margin: 0 0 0.75rem;
  }

  .subhead {
    font-family: 'Lora', Georgia, serif;
    font-weight: 400;
    font-style: italic;
    font-size: 1.25rem;
    color: var(--blue);
    margin: 0 0 1.5rem;
  }

  .date-stamp {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 0.875rem;
    color: var(--gray2);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2rem;
    display: block;
  }

  figure.hero {
    margin: 0 0 2rem;
    .gatsby-image-wrapper,
    img {
      width: 100%;
      height: auto;
      display: block;
    }
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
          <div className="brand-mark">BluePath Finance</div>
          {article?.publication && (
            <div className="publication">{article.publication}</div>
          )}
          {article?.title && <h1>{article.title}</h1>}
          {article?.subhead && <p className="subhead">{article.subhead}</p>}
          {publishedAt && <time className="date-stamp">{publishedAt}</time>}
          {hero && (
            <figure className="hero">
              <GatsbyImage image={hero} alt={article?.title ?? 'Article hero image'} />
            </figure>
          )}
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
