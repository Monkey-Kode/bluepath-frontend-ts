'use server';

import { revalidateTag, updateTag } from 'next/cache';
import { draftMode } from 'next/headers';
import { parseTags } from 'next-sanity/live';

export async function disableDraftMode() {
  'use server';
  await Promise.allSettled([
    (await draftMode()).disable(),
    // Small delay so the disabling toast is visible
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
}

/**
 * Runs when `<SanityLive>` hears that content changed. It keeps next-sanity 12's cache
 * invalidation, which version 13 no longer does by default. An open page shows a published change
 * within seconds. In draft mode, it marks the tags stale and refreshes the page.
 * next-sanity 13 also dropped the refresh on window focus and on reconnect. Its migration guide
 * advises against the focus refresh with Next 16, and Next.js is adding its own reconnect support.
 * The site leaves both out.
 */
export async function refreshSanityTags(
  unsafeTags: unknown,
): Promise<void | 'refresh'> {
  const { isEnabled: isDraftMode } = await draftMode();
  const { tags } = parseTags(unsafeTags);
  for (const tag of tags) {
    if (isDraftMode) {
      revalidateTag(tag, 'max');
    } else {
      updateTag(tag);
    }
  }
  if (isDraftMode) return 'refresh';
}
