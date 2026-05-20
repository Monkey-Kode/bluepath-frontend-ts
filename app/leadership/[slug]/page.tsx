import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import TeamMemberBio from '@/components/TeamMemberBio';
import { teamBlurb } from '@/lib/team';
import { sanityFetch } from '@/sanity/lib/live';
import { teamMemberBySlugQuery, teamSlugsQuery } from '@/sanity/lib/queries';

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: teamSlugsQuery,
    perspective: 'published',
    stega: false,
  });
  return (data ?? [])
    .filter((m) => m.slug)
    .map((m) => ({ slug: m.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: member } = await sanityFetch({
    query: teamMemberBySlugQuery,
    params: { slug },
    stega: false,
  });
  if (!member) return {};

  const title = member.role
    ? `${member.name} — ${member.role}`
    : (member.name ?? 'Team');
  const description = teamBlurb(member.excerpt, member.bio) || undefined;
  const ogImage = member.image?.asset?.url ?? undefined;

  return {
    title,
    description,
    openGraph: {
      type: 'profile',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function LeadershipMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: member } = await sanityFetch({
    query: teamMemberBySlugQuery,
    params: { slug },
  });

  if (!member) notFound();

  return (
    <div>
      <SiteHeader />
      <TeamMemberBio member={member} />
      <SiteFooter />
    </div>
  );
}
