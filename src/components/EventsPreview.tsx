import { GatsbyImage } from "gatsby-plugin-image";
import React from "react";
import styled from "styled-components";
import { ArrElement } from "../types";
const StyledEventsPreview = styled.div`
  margin-top: 2em;
  padding-inline: 1rem;
  .card {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--white);
  }
  .card-image {
    flex: 1 20%;
  }
  .card-content {
    flex: 1 80%;
    padding: 1em;
  }
  @media (max-width: 800px) {
    .card {
      flex-direction: column;
    }
    .card-content {
      p {
        font-size: 0.75rem;
        line-height: 1.1rem;
      }
    }
  }
  h2 {
    font-size: 1.5rem;
    font-weight: 400;
  }
  .button {
    background-color: var(--orange);
    border: none;
    padding: 0.5rem 1.3rem;
    color: black;
    display: inline-block;
  }
  small {
    /* color: var(--gray2); */
    color: var(--white);
    padding-bottom: 0.5rem;
    display: block;
    font-style: italic;
  }
`;

const EventsPreview = ({
  sanityEvent,
}: {
  sanityEvent: ArrElement<Queries.AllEventsQuery["allSanityEvent"]["nodes"]>;
}) => {
  return (
    <StyledEventsPreview>
      <div className="card">
        <div className="card-image">
          <figure>
            {sanityEvent?.image?.asset?.gatsbyImageData && (
              <GatsbyImage
                image={sanityEvent.image.asset.gatsbyImageData}
                alt="Event Image"
              />
            )}
          </figure>
        </div>
        <div className="card-content">
          <small>
            {sanityEvent?.eventAt &&
              (() => {
                const [year, month, day] = sanityEvent.eventAt
                  .split("-")
                  .map(Number);
                return new Date(year, month - 1, day).toLocaleDateString(
                  "en-us",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  },
                );
              })()}
          </small>
          <h2>{sanityEvent?.name}</h2>
          <p>{sanityEvent.description}</p>
          {sanityEvent.slug?.current && (
            <a className="button" href={`/event/${sanityEvent.slug?.current}`}>
              Continue Reading
            </a>
          )}
        </div>
      </div>
    </StyledEventsPreview>
  );
};
export default EventsPreview;
