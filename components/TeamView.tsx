'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import SanityImage from '@/components/SanityImage';
import ViewTransition from '@/components/ViewTransition';
import { photoTransitionName, teamBlurb } from '@/lib/team';
import sortObject from '@/utils/sortObject';
import type { TeamQueryResult } from '@/sanity.types';

type Member = TeamQueryResult[number];

const CARD_CHROME = 'block no-underline text-inherit';

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
    <span className="block w-full aspect-[4/5] overflow-hidden bg-surface">
      <SanityImage
        className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.04]"
        image={member.image}
        alt={member.name ?? ''}
        width={680}
      />
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
      <h2 className="font-sans font-semibold text-blue text-h3 leading-[1.2] mt-[1.35rem] mb-0 transition-colors duration-[250ms] group-hover:text-accent">
        {member.name}
      </h2>
      {(member.role || member.roleSubtitle) && (
        <p className="font-sans text-[#1a1a1a] text-base leading-[1.4] mt-[0.3rem] mb-0">
          {[member.role, member.roleSubtitle].filter(Boolean).join(', ')}
        </p>
      )}
      {blurb && (
        <p className="font-sans text-black text-p leading-[1.5] mt-[1.1rem] mb-0">
          {blurb}
        </p>
      )}
      {hasSlug && (
        <span className="inline-block font-sans font-bold text-[#111] text-base mt-[0.9rem] transition-colors duration-[250ms] group-hover:text-accent">
          Read more
        </span>
      )}
    </>
  );
}

export default function TeamView({ team }: { team: TeamQueryResult }) {
  const members = sortObject(team) as Member[];

  return (
    <main className="header-offset bg-white text-blue pb-24 px-5">
      <div className="mx-auto max-w-7xl px-5 team-inner min-h-[70vh]">
        <h1 className="font-sans font-extrabold text-blue text-h2 leading-[1.05] mx-0 mt-8 mb-12">
          Leadership
        </h1>

        <ul className="list-none m-0 p-0 grid grid-cols-3 gap-x-12 gap-y-16 items-start max-[900px]:grid-cols-2 max-[900px]:gap-x-8 max-[900px]:gap-y-12 max-[600px]:grid-cols-1 max-[600px]:gap-y-12">
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
                <Link
                  href={`/leadership/${member.slug}/`}
                  className={`group ${CARD_CHROME}`}
                >
                  <CardBody member={member} />
                </Link>
              ) : (
                <div className={CARD_CHROME}>
                  <CardBody member={member} />
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </main>
  );
}
