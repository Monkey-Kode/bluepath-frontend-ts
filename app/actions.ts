'use server';

import { draftMode } from 'next/headers';

export async function disableDraftMode() {
  'use server';
  await Promise.allSettled([
    (await draftMode()).disable(),
    // Small delay so the disabling toast is visible
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
}
