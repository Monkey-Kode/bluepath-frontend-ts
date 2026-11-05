/**
 * Shared helpers for the article archives (/news-and-events/ and /case-studies/) and their
 * detail pages. The view-transition name MUST be derived identically on both the archive card
 * and the detail hero so the browser pairs them and morphs the image during navigation. The kind
 * is part of the name to keep slugs from colliding across collections.
 */

/** Each kind is the Sanity document type of its articles. */
export type ArticleKind = 'news' | 'event' | 'caseStudy';

/** Where each kind's detail pages live. */
export const ARTICLE_PATHS: Record<ArticleKind, string> = {
  news: '/news/',
  event: '/events/',
  caseStudy: '/case-studies/',
};

export function mediaTransitionName(
  kind: ArticleKind,
  slug: string | null | undefined,
): string | undefined {
  return slug ? `media-${kind}-${slug}` : undefined;
}

export function titleTransitionName(
  kind: ArticleKind,
  slug: string | null | undefined,
): string | undefined {
  return slug ? `title-${kind}-${slug}` : undefined;
}

/** A date such as "March 10, 2026", or "" for a missing or unreadable one. */
export function formatArticleDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type WithAsset = { asset?: { _id?: string | null } | null };

/** The archive thumbnail: the featured image, else the hero image. */
export function archiveImage<F extends WithAsset, H extends WithAsset>(
  featured: F | null | undefined,
  hero: H | null | undefined,
): F | H | null {
  return featured?.asset?._id ? featured : (hero ?? null);
}
