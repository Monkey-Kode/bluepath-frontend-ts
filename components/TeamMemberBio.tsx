'use client';

import Link from 'next/link';

import SanityImage from '@/components/SanityImage';
import ViewTransition from '@/components/ViewTransition';
import { photoTransitionName, teamParagraphs } from '@/lib/team';
import type { TeamMemberBySlugQueryResult } from '@/sanity.types';

type Member = NonNullable<TeamMemberBySlugQueryResult>;

export default function TeamMemberBio({ member }: { member: Member }) {
  const paragraphs = teamParagraphs(member.bio);
  const photoVt = photoTransitionName(member.slug);

  const photo = member.image?.asset?._id ? (
    <div className="w-full aspect-[4/5] overflow-hidden bg-surface [&_img]:w-full [&_img]:h-full [&_img]:object-cover">
      <SanityImage image={member.image} alt={member.name ?? ''} width={900} />
    </div>
  ) : null;

  return (
    <main className="header-offset bg-white text-blue pb-24 px-5">
      <div className="bio-inner max-w-[1100px] mx-auto">
        <Link
          href="/leadership/"
          className="inline-block font-sans font-semibold text-[0.95rem] text-blue no-underline mb-10 transition-colors duration-[250ms] hover:text-accent"
        >
          ← Back to Leadership
        </Link>

        <div className="grid grid-cols-[minmax(280px,420px)_1fr] gap-14 items-start max-[860px]:grid-cols-1 max-[860px]:gap-8">
          {photo &&
            (photoVt ? (
              <ViewTransition name={photoVt} share="morph">
                {photo}
              </ViewTransition>
            ) : (
              photo
            ))}

          <div>
            <h1 className="font-sans font-bold text-blue text-h1 leading-[1.05] tracking-[-0.01em] m-0">
              {member.name}
            </h1>
            {member.role && (
              <p className="font-sans text-[#1a1a1a] text-h4 leading-[1.35] mt-[0.6rem] mb-0">
                {member.role}
              </p>
            )}
            {member.roleSubtitle && (
              <p className="font-sans text-[#1a1a1a] text-h4 leading-[1.35] mt-[0.6rem] mb-0">
                {member.roleSubtitle}
              </p>
            )}
            <hr className="h-px bg-accent border-0 w-full my-7" />
            <div className="max-w-[62ch] [&_p]:font-sans [&_p]:text-[#2b2b2b] [&_p]:text-[1.05rem] [&_p]:leading-[1.75] [&_p]:m-0 [&_p]:mb-[1.1rem]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
