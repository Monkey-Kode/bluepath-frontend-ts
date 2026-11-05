import { SHADES } from '@/lib/mapProjects/shading';

/**
 * The "Plants per state" key (FR-003, AC-2.2). Its steps are the map's own shades, darkest
 * first, so the key and the map always agree. From 800 px, it sits over the map's lower left,
 * above Google's logo. Below 800 px, it sits in one row under the map. Its parent must be the
 * positioned box around the map.
 */
export default function MapKey() {
  return (
    <div
      data-map-key
      className="mt-3 flex items-center justify-center gap-2 text-legend text-micro tablet:pointer-events-none tablet:absolute tablet:bottom-10 tablet:left-4 tablet:mt-0 tablet:grid tablet:grid-cols-2 tablet:gap-x-0 tablet:gap-y-1 tablet:rounded-sm tablet:bg-white/90 tablet:p-2"
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
            className="h-2.5 w-5 tablet:w-7"
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
