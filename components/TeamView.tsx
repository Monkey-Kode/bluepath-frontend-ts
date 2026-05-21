'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import SanityImage from '@/components/SanityImage';
import ViewTransition from '@/components/ViewTransition';
import { photoTransitionName, teamBlurb } from '@/lib/team';
import sortObject from '@/utils/sortObject';
import type { TeamQueryResult } from '@/sanity.types';

type Member = TeamQueryResult[number];

const CARD_CHROME =
    'block no-underline text-inherit ' +
    '[&_.photo]:block [&_.photo]:w-full [&_.photo]:aspect-[4/5] [&_.photo]:overflow-hidden [&_.photo]:bg-surface ' +
    '[&_.photo_img]:w-full [&_.photo_img]:h-full [&_.photo_img]:object-cover [&_.photo_img]:transition-transform [&_.photo_img]:duration-500 [&_.photo_img]:ease-in-out ' +
    '[&_.name]:font-sans [&_.name]:font-bold [&_.name]:text-blue [&_.name]:text-h3 [&_.name]:leading-[1.2] [&_.name]:mt-[1.35rem] [&_.name]:mb-0 [&_.name]:transition-colors [&_.name]:duration-[250ms] ' +
    '[&_.role]:font-sans [&_.role]:text-[#1a1a1a] [&_.role]:text-base [&_.role]:leading-[1.4] [&_.role]:mt-[0.3rem] [&_.role]:mb-0 ' +
    '[&_.blurb]:font-sans [&_.blurb]:text-[#2b2b2b] [&_.blurb]:text-base [&_.blurb]:leading-[1.5] [&_.blurb]:mt-[1.1rem] [&_.blurb]:mb-0 ' +
    '[&_.read-more]:inline-block [&_.read-more]:font-sans [&_.read-more]:font-bold [&_.read-more]:text-[#111] [&_.read-more]:text-base [&_.read-more]:mt-[0.9rem] [&_.read-more]:transition-colors [&_.read-more]:duration-[250ms]';

const CARD_HOVER =
    'hover:[&_.name]:text-accent hover:[&_.read-more]:text-accent hover:[&_.photo_img]:scale-[1.04]';

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
            {(member.role || member.roleSubtitle) && (
                <p className="role">
                    {[member.role, member.roleSubtitle].filter(Boolean).join(', ')}
                </p>
            )}
            {blurb && <p className="blurb">{blurb}</p>}
            {hasSlug && <span className="read-more">Read more</span>}
        </>
    );
}

export default function TeamView({ team }: { team: TeamQueryResult }) {
    const members = sortObject(team) as Member[];

    return (
        <main className="header-offset bg-white text-blue pb-24 px-5">
            <div className="team-inner max-w-[1180px] mx-auto min-h-[70vh]">
                <h1 className="font-sans font-bold text-blue text-h1 leading-[1.05] tracking-[-0.01em] mx-0 mt-8 mb-12">
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
                                    className={`${CARD_CHROME} ${CARD_HOVER}`}
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
