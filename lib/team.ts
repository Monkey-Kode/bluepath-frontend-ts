/**
 * Shared helpers for the Team archive (/team) and bio (/team/[slug]) pages.
 * The view-transition names MUST be derived identically on both pages so the
 * browser pairs the grid card with the bio hero during navigation.
 */

const BLURB_MAX = 165;

export function teamBlurb(
  excerpt: string | null | undefined,
  bio: string | null | undefined,
): string {
  const fromExcerpt = excerpt?.trim();
  if (fromExcerpt) return fromExcerpt;

  const flat = (bio ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= BLURB_MAX) return flat;
  return `${flat.slice(0, BLURB_MAX).replace(/\s+\S*$/, '')}…`;
}

export function teamParagraphs(bio: string | null | undefined): string[] {
  if (!bio) return [];
  return bio
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function photoTransitionName(
  slug: string | null | undefined,
): string | undefined {
  return slug ? `team-photo-${slug}` : undefined;
}
