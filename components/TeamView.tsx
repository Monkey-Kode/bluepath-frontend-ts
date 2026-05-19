'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import styled from 'styled-components';

import SanityImage from '@/components/SanityImage';
import ViewTransition from '@/components/ViewTransition';
import { photoTransitionName, teamBlurb } from '@/lib/team';
import { headerOffset } from '@/styles/mixins';
import sortObject from '@/utils/sortObject';
import type { TeamQueryResult } from '@/sanity.types';

type Member = TeamQueryResult[number];

const Wrap = styled.main`
  background: #fff;
  color: var(--blue);
  ${headerOffset}
  padding-bottom: 6rem;
  padding-inline: 1.25rem;

  .team-inner {
    max-width: 1180px;
    margin: 0 auto;
    min-height: 70vh;
  }

  h1 {
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h1);
    line-height: 1.05;
    letter-spacing: -0.01em;
    margin: 0 0 3rem;
  }
`;

const Grid = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 3rem;
  row-gap: 4rem;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    column-gap: 2rem;
    row-gap: 3rem;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    row-gap: 3rem;
  }
`;

const cardChrome = `
  display: block;
  text-decoration: none;
  color: inherit;

  .photo {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    background: var(--surface-muted, #f6f7f9);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }
  }

  .name {
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: var(--blue);
    font-size: var(--text-h3);
    line-height: 1.2;
    margin: 1.35rem 0 0;
    transition: color 0.25s ease;
  }

  .role,
  .role-subtitle {
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    font-size: 1rem;
    line-height: 1.4;
    margin: 0.3rem 0 0;
  }

  .blurb {
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    color: #2b2b2b;
    font-size: 1rem;
    line-height: 1.6;
    margin: 1.1rem 0 0;
  }

  .read-more {
    display: inline-block;
    font-family: var(--font-inter), 'Inter', Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: #111;
    font-size: 1rem;
    margin: 0.9rem 0 0;
    transition: color 0.25s ease;
  }
`;

const CardLink = styled(Link)`
  ${cardChrome}

  &:hover .name {
    color: var(--accent);
  }
  &:hover .read-more {
    color: var(--accent);
  }
  &:hover .photo img {
    transform: scale(1.04);
  }
`;

const CardStatic = styled.div`
  ${cardChrome}
`;

const REVEAL = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
};

function CardBody({ member }: { member: Member }) {
  const blurb = teamBlurb(member.excerpt, member.bio);
  const hasSlug = Boolean(member.slug);
  const photoVt = photoTransitionName(member.slug);

  const photo = member.image?.asset?._id ? (
    <span className="photo">
      <SanityImage image={member.image} alt={member.name ?? ''} width={680} />
    </span>
  ) : null;

  return (
    <>
      {photo &&
        (photoVt ? (
          <ViewTransition name={photoVt} share="morph">
            {photo}
          </ViewTransition>
        ) : (
          photo
        ))}
      <h2 className="name">{member.name}</h2>
      {member.role && <p className="role">{member.role}</p>}
      {member.roleSubtitle && (
        <p className="role-subtitle">{member.roleSubtitle}</p>
      )}
      {blurb && <p className="blurb">{blurb}</p>}
      {hasSlug && <span className="read-more">Read more</span>}
    </>
  );
}

export default function TeamView({ team }: { team: TeamQueryResult }) {
  const members = sortObject(team) as Member[];

  return (
    <Wrap>
      <div className="team-inner">
        <h1>Team</h1>

        <Grid>
          {members.map((member, i) => (
            <motion.li
              key={member.id}
              initial={REVEAL.initial}
              whileInView={REVEAL.whileInView}
              viewport={REVEAL.viewport}
              transition={{
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
                delay: (i % 3) * 0.08,
              }}
            >
              {member.slug ? (
                <CardLink href={`/team/${member.slug}/`}>
                  <CardBody member={member} />
                </CardLink>
              ) : (
                <CardStatic>
                  <CardBody member={member} />
                </CardStatic>
              )}
            </motion.li>
          ))}
        </Grid>
      </div>
    </Wrap>
  );
}
