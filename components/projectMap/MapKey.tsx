import { twMerge } from 'tailwind-merge';
import { SHADES } from '@/lib/mapProjects/shading';
import { MAP_OVERLAY } from './overlay';

/**
 * The "Plants per state" key (FR-003, AC-2.2). Its steps are the map's own shades, darkest
 * first, so the key and the map always agree. It sits on the map: in one row below 800 px, and
 * as the design's block from 800 px.
 */
export default function MapKey({ className }: { className?: string }) {
  return (
    <div
      data-map-key
      className={twMerge(
        MAP_OVERLAY,
        'flex items-center gap-2 whitespace-nowrap px-2 py-1 text-legend text-micro tablet:grid tablet:grid-cols-2 tablet:gap-x-0 tablet:gap-y-1 tablet:p-2',
        className,
      )}
    >
      <p className="tablet:col-span-2">Plants per state</p>
      <span className="sr-only">
        Darker states have fewer plants, from 1 at the darkest to 100 at the
        lightest.
      </span>
      <span
        aria-hidden="true"
        className="text-legend-faded tablet:col-start-1 tablet:row-start-3"
      >
        1
      </span>
      <span
        aria-hidden="true"
        className="flex tablet:col-span-2 tablet:row-start-2"
      >
        {SHADES.map(({ from, color }) => (
          <span
            key={from}
            className="h-2.5 w-3.5 tablet:w-7"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
      <span
        aria-hidden="true"
        className="text-legend-faded tablet:col-start-2 tablet:row-start-3 tablet:justify-self-end"
      >
        100
      </span>
    </div>
  );
}
