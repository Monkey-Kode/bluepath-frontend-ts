import React, { useState } from 'react';
import { graphql, type PageProps, type HeadProps } from 'gatsby';
import { GatsbyImage, getImage, type IGatsbyImageData } from 'gatsby-plugin-image';
import styled from 'styled-components';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import sortObject from '../utils/sortObject';
import { headerOffset } from '../styles/mixins';

type TeamNode = {
  id: string;
  name?: string | null;
  role?: string | null;
  bio?: string | null;
  order?: number | null;
  image?: {
    asset?: { gatsbyImageData?: IGatsbyImageData | null } | null;
  } | null;
};

type LeadershipData = { allSanityTeam: { nodes: TeamNode[] } };

const StyledLeadership = styled.main`
  background: #fff;
  color: var(--blue);
  ${headerOffset}
  padding-bottom: 5rem;
  padding-inline: 1.25rem;
  position: relative;

  @media (min-width: 800px) {
    padding-left: 6rem;
    padding-right: 2rem;
  }

  .side-rail {
    display: none;
    position: absolute;
    top: 50%;
    left: 1.25rem;
    transform: rotate(-90deg) translateY(-50%);
    transform-origin: left top;
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.4em;
    font-size: 0.75rem;
    color: var(--blue);
    font-weight: 700;

    @media (min-width: 800px) {
      display: block;
    }
  }

  .leadership-wrap {
    max-width: 1100px;
    margin: 0 auto;
  }

  h1 {
    font-family: 'Lora', Georgia, serif;
    font-weight: 500;
    color: var(--blue);
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 1.1;
    margin: 0 0 2.5rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 2rem 2.5rem;
    margin-bottom: 2.5rem;
  }
`;

const Person = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: opacity 0.2s ease;

  ${(p) =>
    p.$expanded &&
    `
    opacity: 0.7;
  `}

  .photo {
    aspect-ratio: 1;
    background: rgba(0, 65, 129, 0.08);
    overflow: hidden;
    .gatsby-image-wrapper {
      width: 100%;
      height: 100%;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .name {
    font-family: 'Lora', Georgia, serif;
    font-weight: 500;
    color: var(--blue);
    font-size: 1.375rem;
    margin: 0;
  }

  .role {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gray2);
    font-size: 0.75rem;
    margin: 0;
  }
`;

const BioPanel = styled.div`
  grid-column: 1 / -1;
  background: rgba(0, 65, 129, 0.04);
  border-left: 4px solid var(--orange);
  padding: 1.75rem 2rem;
  margin-bottom: 1rem;
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  color: var(--blue);
  line-height: 1.7;

  h2 {
    font-family: 'Lora', Georgia, serif;
    color: var(--blue);
    font-size: 1.5rem;
    font-weight: 500;
    margin: 0 0 0.25rem;
  }

  .bio-role {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gray2);
    font-size: 0.75rem;
    margin: 0 0 1rem;
  }

  p {
    color: var(--blue);
    margin: 0 0 0.75rem;
  }

  button.close {
    background: transparent;
    border: 0;
    color: var(--blue);
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.5rem 0 0;
    &:hover {
      color: var(--orange);
    }
  }
`;

function paragraphs(bio: string | null | undefined): string[] {
  if (!bio) return [];
  return bio
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
}

const LeadershipPage = ({
  data,
  location,
}: PageProps<LeadershipData>) => {
  const members = sortObject(data.allSanityTeam.nodes) as TeamNode[];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = members.find((m) => m.id === expandedId) ?? null;

  return (
    <div>
      <Header location={location} />
      <StyledLeadership>
        <div className="side-rail">Leadership</div>
        <div className="leadership-wrap">
          <h1>Leadership</h1>
          <div className="grid">
            {members.map((member) => {
              const img = member.image?.asset?.gatsbyImageData
                ? getImage(member.image.asset.gatsbyImageData)
                : null;
              const isExpanded = expandedId === member.id;
              return (
                <React.Fragment key={member.id}>
                  <Person
                    $expanded={isExpanded}
                    onClick={() =>
                      setExpandedId((current) =>
                        current === member.id ? null : member.id,
                      )
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId((current) =>
                          current === member.id ? null : member.id,
                        );
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <div className="photo">
                      {img && (
                        <GatsbyImage image={img} alt={member.name ?? ''} />
                      )}
                    </div>
                    <p className="name">{member.name}</p>
                    {member.role && <p className="role">{member.role}</p>}
                  </Person>
                </React.Fragment>
              );
            })}
            {expanded && (
              <BioPanel>
                <h2>{expanded.name}</h2>
                {expanded.role && <p className="bio-role">{expanded.role}</p>}
                {paragraphs(expanded.bio).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <button
                  type="button"
                  className="close"
                  onClick={() => setExpandedId(null)}
                >
                  Close ↑
                </button>
              </BioPanel>
            )}
          </div>
        </div>
      </StyledLeadership>
      <Footer location={location} />
    </div>
  );
};

export const Head = ({ location }: HeadProps) => (
  <SEO
    title="Leadership"
    description="The team behind BluePath Finance."
    location={location as Location}
  />
);

export const query = graphql`
  query Leadership {
    allSanityTeam {
      nodes {
        id
        name
        role
        bio
        order
        image {
          asset {
            gatsbyImageData(width: 600, layout: CONSTRAINED, placeholder: BLURRED)
          }
        }
      }
    }
  }
`;

export default LeadershipPage;
