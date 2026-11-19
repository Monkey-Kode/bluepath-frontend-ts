import { type StegaCleaned, stegaClean } from 'next-sanity';

const ALIGN = {
  left: 'flex flex-col items-center justify-start',
  right: 'flex flex-col items-center justify-end',
  center: 'flex flex-col items-center justify-center',
} as const;

// Pages already pass boxLocation through withCleanBoxLocation. Cleaning it again here keeps the
// lookup safe if a caller passes a raw draft-mode value with stega characters.
export default function boxAlignClass(
  boxLocation: string | null | undefined,
): string {
  const key = stegaClean(boxLocation ?? '') as keyof typeof ALIGN;
  return ALIGN[key] ?? ALIGN.left;
}

/**
 * Returns the item with a clean `boxLocation`. Since next-sanity 13, `sanityFetch` types draft-mode
 * strings as stega-branded. The components type `boxLocation` as the plain `'left' | 'center' |
 * 'right'` union, so pages clean it before passing fetched data on.
 */
export function withCleanBoxLocation<T extends { boxLocation: string | null }>(
  item: T,
): Omit<T, 'boxLocation'> & { boxLocation: StegaCleaned<T['boxLocation']> } {
  const { boxLocation, ...rest } = item;
  return { ...rest, boxLocation: stegaClean<T['boxLocation']>(boxLocation) };
}
