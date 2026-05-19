'use client';

import Link from 'next/link';
import styled from 'styled-components';

import SanityImage from '@/components/SanityImage';
import ViewTransition from '@/components/ViewTransition';
import { photoTransitionName, teamParagraphs } from '@/lib/team';
import { headerOffset } from '@/styles/mixins';
import type { TeamMemberBySlugQueryResult } from '@/sanity.types';

type Member = NonNullable<TeamMemberBySlugQueryResult>;

const Wrap = styled.main`
  background: #fff;
  color: var(--blue);
  ${headerOffset}
  padding-bottom: 6rem;
  padding-inline: 1.25rem;

  .bio-inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  .back {
    display: inline-block;
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--blue);
    text-decoration: none;
    margin: 0 0 2.5rem;
    transition: color 0.25s ease;

    &:hover {
      color: var(--accent);
    }
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 420px) 1fr;
  gap: 3.5rem;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const Photo = styled.div`
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--surface-muted, #f6f7f9);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Content = styled.div`
  h1 {
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h1);
    line-height: 1.05;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .role,
  .role-subtitle {
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    font-size: var(--text-h4);
    line-height: 1.35;
    margin: 0.6rem 0 0;
  }

  .rule {
    height: 1px;
    background: var(--accent);
    border: 0;
    width: 100%;
    margin: 1.75rem 0;
  }

  .bio {
    max-width: 62ch;
  }

  .bio p {
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    color: #2b2b2b;
    font-size: 1.05rem;
    line-height: 1.75;
    margin: 0 0 1.1rem;
  }
`;

export default function TeamMemberBio({ member }: { member: Member }) {
  const paragraphs = teamParagraphs(member.bio);
  const photoVt = photoTransitionName(member.slug);

  const photo = member.image?.asset?._id ? (
    <Photo>
      <SanityImage image={member.image} alt={member.name ?? ''} width={900} />
    </Photo>
  ) : null;

  return (
    <Wrap>
      <div className="bio-inner">
        <Link className="back" href="/team/">
          ← Back to Team
        </Link>

        <Layout>
          {photo &&
            (photoVt ? (
              <ViewTransition name={photoVt} share="morph">
                {photo}
              </ViewTransition>
            ) : (
              photo
            ))}

          <Content>
            <h1>{member.name}</h1>
            {member.role && <p className="role">{member.role}</p>}
            {member.roleSubtitle && (
              <p className="role-subtitle">{member.roleSubtitle}</p>
            )}
            <hr className="rule" />
            <div className="bio">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Content>
        </Layout>
      </div>
    </Wrap>
  );
}
