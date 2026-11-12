'use client';

import { twMerge } from 'tailwind-merge';
import { CATEGORIES, type CategoryKey } from '@/lib/categories';
import { legendLook, type Selection } from '@/lib/mapProjects/selection';
import { MAP_OVERLAY } from './overlay';
import Swatch from './Swatch';

interface MapLegendProps {
  selection: Selection;
  onPick: (category: CategoryKey) => void;
  className?: string;
}

/**
 * The category legend at the map's bottom (FR-004). Each entry is a toggle button. Its pressed
 * state tells assistive tech which filter is on (AC-2.8). A click outside the legend turns the
 * filter off, so the legend needs no "all" entry (AC-2.6).
 */
export default function MapLegend({
  selection,
  onPick,
  className,
}: MapLegendProps) {
  return (
    // Below 800 px, the entries wrap into two rows of two. From 800 px, they share one row (AC-2.3).
    <ul
      aria-label="Filter the map by category"
      data-map-legend
      className={twMerge(
        MAP_OVERLAY,
        'grid w-fit grid-cols-2 justify-items-start gap-x-2 px-1 py-0.5 tablet:flex tablet:flex-wrap tablet:justify-center tablet:gap-x-6 tablet:px-2 tablet:py-1',
        className,
      )}
    >
      {CATEGORIES.map(({ key, label }) => {
        const look = legendLook(selection, key);
        return (
          <li key={key}>
            <button
              type="button"
              aria-pressed={look === 'filter'}
              data-look={look}
              onClick={() => onPick(key)}
              className="group inline-flex min-h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-sm px-1 py-0.5 text-left text-legend text-xs uppercase tablet:min-h-8 tablet:gap-2 tablet:px-2 tablet:py-1 tablet:text-sm tablet:tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent data-[look=faded]:text-legend-faded data-[look=filter]:scale-110 motion-safe:transition"
            >
              <Swatch category={key} faded={look === 'faded'} />
              {/* The hidden bold copy reserves the bold width, so bolding never shifts the row. */}
              <span className="grid">
                <span className="col-start-1 row-start-1 group-data-[look=match]:font-bold">
                  {label}
                </span>
                <span
                  aria-hidden="true"
                  className="invisible col-start-1 row-start-1 font-bold"
                >
                  {label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
