import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { graphql, HeadProps, PageProps } from 'gatsby';
import SEO from '../components/SEO';
import styled from 'styled-components';
import { PortableText } from '@portabletext/react';
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import FormBasic from '../components/FormBasic';

const StyledMain = styled.main`
  background: rgb(57, 105, 170);
  background: linear-gradient(
    159deg,
    rgba(42, 117, 185, 1) 0%,
    rgba(78, 155, 227, 1) 24%,
    rgba(0, 65, 131, 1) 60%,
    rgba(25, 65, 129, 1) 100%
  );
  color: black;
  margin-top: 100px;
  .event-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: flex-start;
    justify-items: center;
    @media (max-width: 800px) {
      grid-template-columns: 1fr;
    }
  }
  .event-text {
    padding: 12.5% 2em;
    @media (max-width: 800px) {
      padding: 1em 2em;
    }
  }
  label {
    display: none;
  }
  input {
    margin-bottom: 0.35em;
  }
`;

function Event({
  data: { content },
  location,
}: PageProps<Queries.EventQuery> & { location: Location }) {
  const richText = content?.content ?? null;
  const image = content?.image?.asset?.gatsbyImageData
    ? getImage(content?.image?.asset?.gatsbyImageData)
    : null;
  return (
    <div className="event">
      <Header location={location} />
      <StyledMain>
        <div className="wrap event-content">
          {image && (
            <div>
              <GatsbyImage image={image} alt="Event Image" />
            </div>
          )}
          <div className="event-text">
            {content && <h2>{content.name}</h2>}
            {richText && richText !== null && (
              <div>
                <PortableText value={richText as any} />
              </div>
            )}
            <FormBasic name={content?.name} />
          </div>
        </div>
      </StyledMain>
      <Footer location={location} />
    </div>
  );
}

export const Head = ({ data: { content } }: HeadProps<Queries.EventQuery>) => (
  <SEO title={content?.description ?? 'Event Page'} />
);

export const query = graphql`
  query Event($slug: String!) {
    content: sanityEvent(slug: { current: { eq: $slug } }) {
      content {
        _key
        style
        list
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
          gatsbyImageData(width: 2000, layout: CONSTRAINED, placeholder: NONE)
        }
      }
      name
      slug {
        current
      }
    }
  }
`;

export default Event;
