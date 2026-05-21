'use client';

import { motion } from 'framer-motion';

import scrollTo from '@/lib/scrollTo';
import SanityImage from '@/components/SanityImage';
import type { TeamQueryResult } from '@/sanity.types';

type TeamMember = TeamQueryResult[number];

function TeamThumbnail({
  id,
  name,
  role,
  image,
  setcurrentSlide,
}: {
  id: TeamMember['id'];
  name: TeamMember['name'];
  role: TeamMember['role'];
  image: TeamMember['image'];
  setcurrentSlide: (id: TeamMember['id']) => void;
}) {
  return (
    <motion.div>
      <a
        key={id}
        href={`#${id}`}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          scrollTo('body');
          setcurrentSlide(id);
        }}
        className="mx-auto grid h-full w-[200px] max-w-[200px] grid-rows-[auto_auto_auto] self-stretch overflow-hidden bg-blue pt-0 max-[1023px]:w-auto max-[1023px]:max-w-none"
      >
        {image?.asset?._id && (
          <SanityImage image={image} alt={`${name}`} width={284} />
        )}

        <div className="content flex h-full flex-col items-center justify-center px-2 pt-4 pb-6">
          <h3 className="m-0 px-4 text-center uppercase text-white text-[clamp(0.6875rem,_0.573rem_+_0.488vw,_1rem)]">
            {name}
          </h3>
          <p className="m-0 px-2 pt-2 text-center uppercase font-thin text-white text-[clamp(0.5rem,_0.7vw,_0.8rem)] max-tablet:font-normal">
            {role}
          </p>
        </div>
      </a>
    </motion.div>
  );
}

export default TeamThumbnail;
