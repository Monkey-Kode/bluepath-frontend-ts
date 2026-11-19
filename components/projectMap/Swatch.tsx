import { twMerge } from 'tailwind-merge';
import { CATEGORY_BY_KEY, type CategoryKey } from '@/lib/categories';

interface SwatchProps {
  category: CategoryKey;
  faded?: boolean;
}

/**
 * A category's round color dot, in the color its markers use (AC-2.3). The category's name
 * always sits beside it, so screen readers skip the dot.
 */
export default function Swatch({ category, faded = false }: SwatchProps) {
  return (
    <span
      aria-hidden="true"
      className={twMerge(
        'size-3 shrink-0 rounded-full motion-safe:transition-opacity',
        faded && 'opacity-40',
      )}
      style={{ backgroundColor: CATEGORY_BY_KEY[category].color }}
    />
  );
}
