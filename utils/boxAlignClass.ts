import { stegaClean } from 'next-sanity';

const ALIGN = {
  left: 'flex flex-col items-center justify-start',
  right: 'flex flex-col items-center justify-end',
  center: 'flex flex-col items-center justify-center',
} as const;

// boxLocation arrives stega-encoded in draft mode (invisible chars appended by
// next-sanity Visual Editing), so the raw value won't match a class key — clean
// it before lookup.
export default function boxAlignClass(
  boxLocation: string | null | undefined,
): string {
  const key = stegaClean(boxLocation ?? '') as keyof typeof ALIGN;
  return ALIGN[key] ?? ALIGN.left;
}
