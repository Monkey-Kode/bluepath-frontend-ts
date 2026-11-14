'use client';

import { twMerge } from 'tailwind-merge';
import { MAP_OVERLAY } from './overlay';
import { PREVIEW_STOP } from './useCategoryPreview';

interface MapPreviewStopProps {
  /** `byKeyboard` is true when Enter or Space pressed the button, rather than a pointer. */
  onStop: (byKeyboard: boolean) => void;
  className?: string;
}

/**
 * Stops the category preview (WCAG 2.2.2). The preview runs longer than 5 seconds, so it needs a
 * way to stop. The button shows only while the preview runs.
 */
export default function MapPreviewStop({
  onStop,
  className,
}: MapPreviewStopProps) {
  return (
    <button
      type="button"
      {...{ [PREVIEW_STOP]: '' }}
      aria-label="Stop the category preview"
      title="Stop the category preview"
      // A click from a key press has no pointer position, so its `detail` is 0.
      onClick={(event) => onStop(event.detail === 0)}
      className={twMerge(
        MAP_OVERLAY,
        'grid size-8 cursor-pointer place-items-center text-legend focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
        className,
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3">
        <rect x="2" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
        <rect x="7" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
      </svg>
    </button>
  );
}
