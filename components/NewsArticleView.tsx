'use client';

import styled from 'styled-components';

import NewsBody from '@/components/NewsBody';
import SanityImage from '@/components/SanityImage';
import { headerOffset } from '@/styles/mixins';
import type { NewsBySlugQueryResult } from '@/sanity.types';

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

  h1 {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h1);
    line-height: 1.2;
    margin: 0 0 1.5rem;
    text-wrap: balance;
  }

  figure.hero {
    margin: 0 0 1rem;
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

export default function NewsArticleView({
  article,
}: {
  article: NonNullable<NewsBySlugQueryResult>;
}) {
  const publishedAt = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <StyledArticle>
      <article className="article-wrap">
        {article.title && <h1>{article.title}</h1>}
        {article.heroImage?.asset?._id && (
          <figure className="hero">
            <SanityImage
              image={article.heroImage}
              alt={article.title ?? 'Article hero image'}
              width={1440}
            />
          </figure>
        )}
        {publishedAt && <time className="date-stamp">{publishedAt}</time>}
        {article.body ? <NewsBody value={article.body} /> : null}
      </article>
    </StyledArticle>
  );
}
