/**
 * Shared helpers for the News & Events archive (/news-and-events) and the
 * news (/news/[slug]) and event (/events/[slug]) detail pages. The
 * view-transition name MUST be derived identically on both the archive card
 * and the detail hero so the browser pairs them and morphs the image during
 * navigation. News and events are distinct types, so the kind is part of the
 * name to keep slugs from colliding across the two collections.
 */

export type NewsEventKind = 'news' | 'event';

export function mediaTransitionName(
  kind: NewsEventKind,
  slug: string | null | undefined,
): string | undefined {
  return slug ? `media-${kind}-${slug}` : undefined;
}

export function titleTransitionName(
  kind: NewsEventKind,
  slug: string | null | undefined,
): string | undefined {
  return slug ? `title-${kind}-${slug}` : undefined;
}
