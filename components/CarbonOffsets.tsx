'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import SanityImage from '@/components/SanityImage';
import type { ImpactPageContentQueryResult } from '@/sanity.types';

type CarbonOffsetTab = NonNullable<
  NonNullable<ImpactPageContentQueryResult>['carbonOffsetTabs']
>[number];

const TABLIST_ID = 'carbon-offset-tabs';

function CarbonOffsets({ tabs }: { tabs: CarbonOffsetTab[] }) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  // Defensive: nothing to render without tabs (NFR-006).
  if (!tabs.length) return null;

  const safeIndex = Math.min(activeIndex, tabs.length - 1);
  const activeTab = tabs[safeIndex];
  const metrics = activeTab?.metrics ?? [];

  // The icon row is fixed: every tab carries the same icons in the same order,
  // so only the value/label beneath each unmoving icon animates on switch.
  // Reduced motion: plain fade, no travel/bounce (NFR-005).
  const enter = { opacity: 1, y: 0, scale: 1 };
  const initial = reduceMotion
    ? { opacity: 0, y: 0, scale: 1 }
    : { opacity: 0, y: 16, scale: 0.92 };
  const transition = reduceMotion
    ? { duration: 0.2 }
    : { type: 'spring' as const, stiffness: 420, damping: 14, mass: 0.7 };

  return (
    <section className="w-full py-12 text-center tablet:py-20 flex-col justify-center place-content-center">
      <h2 className="text-blue mb-4 px-4 text-[7vw] font-extrabold leading-tight tablet:mb-8 tablet:text-[3rem]">
        Carbon Offset Equivalencies
      </h2>

      <div
        role="tablist"
        aria-label="Carbon offset lifecycle"
        id={TABLIST_ID}
        className="mb-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.12em] tablet:text-sm"
      >
        {tabs.map((tab, i) => (
          <div key={tab._key} className="flex items-center gap-x-3">
            {i > 0 && (
              <span aria-hidden className="text-gray-1/50">
                |
              </span>
            )}
            <button
              type="button"
              role="tab"
              id={`carbon-tab-${i}`}
              aria-selected={i === safeIndex}
              aria-controls="carbon-tabpanel"
              tabIndex={i === safeIndex ? 0 : -1}
              onClick={() => setActiveIndex(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const dir = e.key === 'ArrowRight' ? 1 : -1;
                  const next = (i + dir + tabs.length) % tabs.length;
                  setActiveIndex(next);
                  document.getElementById(`carbon-tab-${next}`)?.focus();
                }
              }}
              className={twMerge(
                'cursor-pointer appearance-none border-none bg-transparent px-1 py-1 uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
                i === safeIndex ? 'text-blue' : 'text-gray-1 hover:text-blue',
              )}
            >
              {tab.name}
            </button>
          </div>
        ))}
      </div>

      <div
        id="carbon-tabpanel"
        role="tabpanel"
        aria-labelledby={`carbon-tab-${safeIndex}`}
        className="mx-auto grid max-w-5xl grid-cols-2 gap-x-4 gap-y-10 px-4 tablet:grid-cols-5 tablet:gap-x-6 justify-center items-start"
      >
        {metrics.map((metric, i) => (
          <div key={metric._key} className="flex flex-col items-center">
            <div className="mb-4 flex items-center justify-center">
              {metric.icon?.asset?._id && (
                <SanityImage
                  image={metric.icon}
                  alt={metric.label ?? 'Carbon offset icon'}
                  width={120}
                  className=""
                />
              )}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={safeIndex}
                initial={initial}
                animate={enter}
                exit={{ opacity: 0 }}
                transition={transition}
                className="flex flex-col items-center"
              >
                <span className="text-blue text-lg font-extrabold leading-tight tablet:text-2xl">
                  {metric.value}
                </span>
                <span className="text-gray-1 mt-1 max-w-[18ch] text-[0.7rem] leading-snug tablet:text-xs">
                  {metric.label}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CarbonOffsets;
