import React from 'react';
import { graphql, HeadProps, PageProps } from 'gatsby';
import styled from 'styled-components';
import { PortableText } from '@portabletext/react';
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import FormBasic from '../components/FormBasic';
import { newsBodyComponents } from '../components/NewsBody';

const StyledMain = styled.main`
  background: #fff;
  color: var(--blue);
  padding: calc(var(--mobile-header-height) + 1.5rem) 1.25rem 5rem;

  @media (min-width: 800px) {
    padding-top: 160px;
  }

  .event-wrap {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 3.5rem;
    align-items: flex-start;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  .event-image {
    .gatsby-image-wrapper {
      width: 100%;
      height: auto;
    }
  }

  .event-meta {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gray2);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    margin-bottom: 0.75rem;

    .label {
      color: var(--blue);
      font-weight: 700;
    }
  }

  h1 {
    font-family: 'Lora', Georgia, serif;
    font-weight: 500;
    color: var(--blue);
    font-size: clamp(2rem, 4vw, 2.75rem);
    line-height: 1.2;
    margin: 0 0 1.5rem;
  }

  .event-body {
    margin-bottom: 2rem;
  }

  .rsvp-card {
    background: rgba(0, 65, 129, 0.04);
    border: 1px solid rgba(0, 65, 129, 0.15);
    padding: 1.5rem;
    margin-top: 2rem;

    h2 {
      font-family: 'Lora', Georgia, serif;
      font-weight: 500;
      color: var(--blue);
      font-size: 1.5rem;
      margin: 0 0 1rem;
    }

    label {
      display: none;
    }

    input,
    textarea,
    select {
      background: #fff;
      border: 1px solid rgba(0, 65, 129, 0.25);
      margin-bottom: 0.75rem;
      padding: 0.6rem 0.75rem;
      &::placeholder {
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 0.8125rem;
        color: var(--gray2);
      }
    }

    button[type='submit'] {
      background: var(--blue);
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.8125rem;
      font-weight: 700;
      padding: 0.75rem 1.75rem;
      border: none;
      cursor: pointer;
      &:hover {
        background: var(--orange);
        color: var(--blue);
      }
    }
  }
`;

function Event({
  data: { content },
  location,
}: PageProps<Queries.EventQuery> & { location: Location }) {
  const richText = content?.content ?? null;
  const image = content?.image?.asset?.gatsbyImageData
    ? getImage(content.image.asset.gatsbyImageData)
    : null;
  const eventDate = content?.eventAt
    ? (() => {
        const [year, month, day] = content.eventAt!.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      })()
    : null;
  return (
    <div className="event">
      <Header location={location} />
      <StyledMain>
        <div className="event-wrap">
          <div className="event-image">
            {image && <GatsbyImage image={image} alt={content?.name ?? 'Event'} />}
          </div>
          <div>
            <div className="event-meta">
              {eventDate && <span>{eventDate}</span>}
              {content?.publication && (
                <span className="label">{content.publication}</span>
              )}
            </div>
            {content?.name && <h1>{content.name}</h1>}
            {richText && (
              <div className="event-body">
                <PortableText
                  value={richText as never}
                  components={newsBodyComponents}
                />
              </div>
            )}
            <div className="rsvp-card">
              <h2>RSVP</h2>
              <FormBasic name={content?.name} />
            </div>
          </div>
        </div>
      </StyledMain>
      <Footer location={location} />
    </div>
  );
}

export const Head = ({ data: { content } }: HeadProps<Queries.EventQuery>) => (
  <SEO title={content?.name ?? 'Event'} description={content?.description ?? undefined} />
);

export const query = graphql`
  query Event($slug: String!) {
    content: sanityEvent(slug: { current: { eq: $slug } }) {
      content {
        _key
        style
        _type
        _rawChildren
        __typename
        children {
          _key
          _type
          __typename
          marks
          text
        }
      }
      description
      eventAt
      image {
        asset {
          gatsbyImageData(width: 720, layout: CONSTRAINED, placeholder: BLURRED)
        }
      }
      name
      publication
      slug {
        current
      }
    }
  }
`;

export default Event;
