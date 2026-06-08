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
    <div className="w-full aspect-[4/5] overflow-hidden bg-surface">
      <SanityImage
        className="w-full h-full object-cover"
        image={member.image}
        alt={member.name ?? ''}
        width={900}
      />
    </div>
  ) : null;

  return (
    <main className="max-w-7xl header-offset bg-white pb-24 px-5 mx-auto">
      <div className="w-full">
        <Link
          href="/leadership/"
          className="inline-block font-sans font-semibold text-sm text-blue no-underline mb-10 transition-colors duration-[250ms] hover:text-accent"
        >
          ← Back
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
            <h1 className="font-sans font-bold text-blue text-h1 tracking-[-0.01em] m-0">
              {member.name}
            </h1>
            {(member.role || member.roleSubtitle) && (
              <p className="font-sans text-[#1a1a1a] text-h4 mt-[0.6rem] mb-0">
                {[member.role, member.roleSubtitle].filter(Boolean).join(', ')}
              </p>
            )}
            <hr className="h-px bg-accent border-0 w-full my-7" />
            <div className="prose prose-lg prose-default prose-p:leading-relaxed prose-p:my-7 prose-headings:font-sans prose-headings:text-black prose-h2:mt-14 prose-h2:mb-4 prose-h3:mt-10 prose-h3:mb-3 prose-a:text-black prose-a:font-medium hover:prose-a:text-accent prose-blockquote:border-accent prose-blockquote:text-black prose-strong:font-semibold">
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
