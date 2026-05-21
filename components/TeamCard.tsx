'use client';

import { motion, AnimatePresence } from 'framer-motion';

import SanityImage from '@/components/SanityImage';
import type { TeamQueryResult } from '@/sanity.types';

type TeamMember = TeamQueryResult[number];

function TeamCard({
    id,
    name,
    role,
    image,
    bio,
}: {
    id: TeamMember['id'];
    name: TeamMember['name'];
    role: TeamMember['role'];
    image: TeamMember['image'];
    bio: TeamMember['bio'];
}) {
    const text = bio?.split('\n').filter((x) => x);

    return (
        <AnimatePresence key={id}>
            <motion.div
                initial={{ opacity: 0, x: '20%' }}
                animate={{ opacity: 1, x: '0%' }}
                exit={{ opacity: 0, x: '20%' }}
            >
                <div
                    id={id}
                    key={id}
                    className="grid h-full w-auto grid-cols-[284px_1fr_1fr] grid-rows-[1fr_2.5fr] bg-blue max-tablet:flex max-tablet:flex-col max-tablet:w-auto"
                >
                    {image?.asset?._id && (
                        <SanityImage image={image} alt={`Team ${name}`} width={284} />
                    )}
                    <h3 className="col-[2/4] row-[1/2] m-0 flex items-center bg-[var(--color-gray-1)] border-b-[var(--border-bottom)] px-8 py-[0.15rem] uppercase text-white text-[clamp(1rem,_2vw,_2rem)] max-tablet:flex-col max-tablet:pt-[0.34rem] max-tablet:text-center">
                        {name}
                        <span className="role pl-4 font-thin text-white max-tablet:px-0 max-tablet:pt-[0.34rem] max-tablet:pb-[0.4em]">
                            {' '}
                            {role}
                        </span>
                    </h3>
                    {text && (
                        <div className="col-[2/4] row-[2/4] px-8 py-4  font-thin text-white min-[500px]:columns-2">
                            {text.map((paragraph, index) => (
                                <p
                                    key={index}
                                    className="pr-4 pb-2 m-0 text-justify text-xs max-tablet:font-normal max-tablet:text-left max-tablet:text-[0.65rem] max-tablet:break-words"
                                >
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default TeamCard;
