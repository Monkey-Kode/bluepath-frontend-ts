'use client';

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import SanityImage from '@/components/SanityImage';
import type { ImpactPageContentQueryResult } from '@/sanity.types';

type CarbonOffsetTab = NonNullable<
  NonNullable<ImpactPageContentQueryResult>['carbonOffsetTabs']
>[number];
type CarbonMetric = NonNullable<CarbonOffsetTab['metrics']>[number];

const TABLIST_ID = 'carbon-offset-tabs';
const STAGGER = 0.08; // seconds between columns
const COUNT_DURATION = 0.9;

// Springy scale-bounce for the metric icons on hover.
const ICON_HOVER = {
  scale: 1.08,
  transition: { type: 'spring' as const, stiffness: 400, damping: 12 },
};

/** Add thousands separators to the integer part only (keeps any decimals). */
function withSeparators(n: number, decimals: number) {
  const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  const [int, dec] = fixed.split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${intFmt}.${dec}` : intFmt;
}

/**
 * Split a display value ("4.5 Billion", "27,905 Acres") into its first numeric
 * token plus the surrounding text, so the number can be counted up while the
 * units stay put. Returns null when there's no number to animate.
 */
function parseValue(value: string) {
  const match = value.match(/\d[\d,]*\.?\d*/);
  if (!match || match.index === undefined) return null;
  const numStr = match[0];
  const target = parseFloat(numStr.replace(/,/g, ''));
  if (Number.isNaN(target)) return null;
  const dot = numStr.indexOf('.');
  const decimals = dot === -1 ? 0 : numStr.length - dot - 1;
  return {
    prefix: value.slice(0, match.index),
    target,
    suffix: value.slice(match.index + numStr.length),
    decimals,
  };
}

/** Counts the numeric part of `value` up from 0 on mount (i.e. on tab switch). */
function CountUpValue({ value, delay }: { value: string; delay: number }) {
  const reduceMotion = useReducedMotion();
  const parsed = useMemo(() => parseValue(value), [value]);
  const mv = useMotionValue(0);
  const text = useTransform(mv, (latest) =>
    parsed
      ? `${parsed.prefix}${withSeparators(latest, parsed.decimals)}${parsed.suffix}`
      : value,
  );

  useEffect(() => {
    if (!parsed) return;
    if (reduceMotion) {
      mv.set(parsed.target);
      return;
    }
    mv.set(0);
    const controls = animate(mv, parsed.target, {
      duration: COUNT_DURATION,
      delay,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [parsed, reduceMotion, delay, mv]);

  if (!parsed) return <>{value}</>;
  return <motion.span>{text}</motion.span>;
}

/**
 * One fixed icon with its value/label beneath. The value/label block replays
 * its fade + count-up whenever it re-mounts — on tab switch (staggered by
 * column) and on hovering this column's icon (immediately, just this column).
 * The icon itself scale-bounces on hover.
 */
function MetricColumn({
  metric,
  index,
  tabIndex,
}: {
  metric: CarbonMetric;
  index: number;
  tabIndex: number;
}) {
  const reduceMotion = useReducedMotion();
  const [hoverNonce, setHoverNonce] = useState(0);
  // -1 sentinel so the first paint counts as a "tab change" (staggered intro).
  const prevTab = useRef(-1);
  const isTabChange = prevTab.current !== tabIndex;
  useEffect(() => {
    prevTab.current = tabIndex;
  }, [tabIndex]);

  // Stagger only when driven by a tab switch; hover replays immediately.
  const delay = reduceMotion ? 0 : isTabChange ? index * STAGGER : 0;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="mb-4 flex cursor-pointer items-center justify-center"
        onMouseEnter={() => setHoverNonce((n) => n + 1)}
        whileHover={reduceMotion ? undefined : ICON_HOVER}
      >
        {metric.icon?.asset?._id && (
          <SanityImage
            image={metric.icon}
            alt={metric.label ?? 'Carbon offset icon'}
            width={120}
            className=""
          />
        )}
      </motion.div>

      <motion.div
        key={`${tabIndex}-${hoverNonce}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <span className="text-blue text-lg font-extrabold leading-tight tablet:text-2xl">
          <CountUpValue value={metric.value} delay={delay} />
        </span>
        <span className="text-gray-1 mt-1 max-w-[18ch] text-[0.7rem] leading-snug tablet:text-xs">
          {metric.label}
        </span>
      </motion.div>
    </div>
  );
}

function CarbonOffsets({ tabs }: { tabs: CarbonOffsetTab[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Defensive: nothing to render without tabs (NFR-006).
  if (!tabs.length) return null;

  const safeIndex = Math.min(activeIndex, tabs.length - 1);
  const activeTab = tabs[safeIndex];
  const metrics = activeTab?.metrics ?? [];

  return (
    <section
      aria-label="Carbon Offset Equivalencies"
      className="w-full pt-12 text-center tablet:pt-20 flex-col justify-center place-content-center"
    >
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
                i === safeIndex
                  ? 'text-accent'
                  : 'text-gray-1 hover:text-accent',
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
        className="mx-auto grid max-w-5xl grid-cols-2 gap-x-4 gap-y-4 px-4 tablet:grid-cols-5 tablet:gap-x-6 justify-center items-start"
      >
        {metrics.map((metric, i) => (
          // Keyed by position, not `_key`: every tab carries its own metric
          // objects (distinct `_key`s); position is the fixed column identity.
          <MetricColumn
            key={i}
            metric={metric}
            index={i}
            tabIndex={safeIndex}
          />
        ))}
      </div>
    </section>
  );
}

export default CarbonOffsets;
