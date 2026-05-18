'use client';

import { PortableText } from '@portabletext/react';
import styled from 'styled-components';

import FormBasic from '@/components/FormBasic';
import { newsBodyComponents } from '@/components/NewsBody';
import SanityImage from '@/components/SanityImage';
import { headerOffset } from '@/styles/mixins';
import type { EventBySlugQueryResult } from '@/sanity.types';

const StyledMain = styled.main`
  background: #fff;
  color: #000;
  ${headerOffset}
  padding-top: calc(var(--header-height, 100px) + 4rem);
  padding-bottom: 5rem;
  padding-inline: 1.25rem;

  .event-wrap {
    max-width: 1200px;
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

  .event-image img {
    width: 100%;
    height: auto;
  }

  .event-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
  }

  .event-date {
    color: var(--blue);
    font-style: italic;
    font-size: 0.9375rem;
    font-weight: 400;
  }

  .event-publication {
    color: var(--blue);
    font-style: italic;
    font-weight: 700;
    font-size: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  h1 {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h1);
    line-height: 1.2;
    margin: 0 0 1.5rem;
    text-wrap: balance;
  }

  .event-body {
    margin-bottom: 2rem;
    font-family: 'Libre Baskerville', Georgia, serif;
    color: #000;
    line-height: 1.5;
    font-size: 1rem;

    p,
    h2,
    h3,
    li,
    blockquote {
      color: #000;
      font-family: 'Libre Baskerville', Georgia, serif;
    }

    p {
      margin: 0 0 1rem;
    }

    h2 {
      font-size: var(--text-h2);
      font-weight: 700;
      margin: 1.5rem 0 0.5rem;
    }

    h3 {
      font-size: var(--text-h3);
      font-weight: 700;
      margin: 1.25rem 0 0.5rem;
    }

    ul,
    ol {
      margin: 0 0 1rem 1.25rem;
    }

    blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 1.25rem;
      margin: 1.5rem 0;
      font-style: italic;
    }
  }

  .rsvp {
    background: transparent;
    border: none;
    padding: 0;
    margin-top: 1.5rem;

    @media (min-width: 800px) {
      max-width: 500px;
    }

    label {
      display: none;
    }

    input,
    textarea,
    select {
      background: #fff;
      border: 1px solid var(--gray-light);
      border-radius: 0;
      margin-bottom: 0.6rem;
      padding: 0.65rem 0.75rem;
      font-family: 'Inter', Helvetica, Arial, sans-serif;
      color: var(--gray-light);
      font-size: 0.875rem;

      &::placeholder {
        color: var(--gray-light);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 1.25rem;
      }
    }

    .submit-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      margin-top: 1rem;
    }

    .submit-triangle {
      width: 23px;
      height: 27px;
      fill: #fff;
      stroke: var(--accent);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
      display: block;
      transform-origin: center;
      transition:
        fill 0.25s ease,
        transform 0.4s cubic-bezier(0.5, 1.6, 0.5, 1);
    }

    .submit-row:hover .submit-triangle,
    .submit-row:focus-within .submit-triangle {
      fill: var(--accent);
      transform: translateX(4px) scale(1.12);
    }

    button[type='submit'] {
      background: #fff;
      color: var(--gray-light);
      border: 1px solid var(--gray-light);
      border-radius: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 1.25rem;
      font-weight: 500;
      padding: 0.5rem;
      cursor: pointer;
      transition:
        background-color 0.2s ease,
        color 0.2s ease,
        border-color 0.2s ease;

      &:hover {
        background: var(--accent);
        color: #fff;
        border-color: var(--accent);
      }
    }
  }
`;

export default function EventView({
  content,
}: {
  content: NonNullable<EventBySlugQueryResult>;
}) {
  const richText = content.content ?? null;
  const eventDate = content.eventAt
    ? (() => {
        const [year, month, day] = content.eventAt.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      })()
    : null;

  return (
    <StyledMain>
      <div className="event-wrap">
        <div className="event-image">
          {content.image?.asset?._id && (
            <SanityImage
              image={content.image}
              alt={content.name ?? 'Event'}
              width={720}
            />
          )}
        </div>
        <div>
          <div className="event-meta">
            {eventDate && <span className="event-date">{eventDate}</span>}
            {content.publication && (
              <span className="event-publication">{content.publication}</span>
            )}
          </div>
          {content.name && <h1>{content.name}</h1>}
          {richText && (
            <div className="event-body">
              <PortableText
                value={richText as never}
                components={newsBodyComponents}
              />
            </div>
          )}
          <div className="rsvp">
            <FormBasic name={content.name} />
          </div>
        </div>
      </div>
    </StyledMain>
  );
}
