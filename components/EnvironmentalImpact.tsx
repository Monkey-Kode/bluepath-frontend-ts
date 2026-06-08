'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import SanityImage from '@/components/SanityImage';
import formatNumber from '@/utils/formatNumber';
import type { ImpactPageContentQueryResult } from '@/sanity.types';

type EnvironmentalCategory = NonNullable<
  NonNullable<ImpactPageContentQueryResult>['environmentalCategories']
>[number];

/**
 * Stat values are stored as plain integer strings ("56657") and get thousands
 * separators here. Values that already contain separators or non-numeric text
 * (e.g. "1.4M") are rendered verbatim (FR-016).
 */
function displayStat(value: string | null | undefined) {
  if (!value) return '';
  return /^\d+$/.test(value) ? formatNumber(Number(value)) : value;
}

function IconCircle({
  category,
  active = false,
}: {
  category: EnvironmentalCategory;
  active?: boolean;
}) {
  return (
    <span
      className={twMerge(
        'flex items-center justify-center transition-colors',
        active ? 'border-accent' : 'border-blue',
      )}
    >
      {category.icon?.asset?._id && (
        <SanityImage
          image={category.icon}
          alt={`${category.name ?? 'Category'} icon`}
          width={120}
          className=""
        />
      )}
    </span>
  );
}

function EnvironmentalImpact({
  categories,
  heading,
}: {
  categories: EnvironmentalCategory[];
  heading?: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Defensive: nothing to render without categories (NFR-006).
  if (!categories.length) return null;

  const selected =
    selectedIndex !== null ? categories[selectedIndex] : undefined;

  const spring = reduceMotion
    ? { duration: 0.2 }
    : { type: 'spring' as const, stiffness: 380, damping: 18, mass: 0.7 };

  const fadeUp = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 14, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.98 },
      };

  return (
    <section className="w-full py-12 text-center tablet:py-20 flex-col place-items-center justify-center">
      <h2 className="text-blue mb-4 px-4 text-[7vw] font-extrabold leading-tight tablet:mb-8 tablet:text-[3rem]">
        {heading || 'Environmental Impact Measurement'}
      </h2>

      {/*
        Category labels are toggles, not a tab strip: clicking one opens its
        category, and either the label or its icon can drive selection (the
        active icon also collapses). Plain buttons with `aria-pressed` express
        the active state honestly — a `role="tablist"` would promise arrow-key
        navigation and a linked tabpanel this disclosure pattern doesn't have.
      */}
      <div
        role="group"
        aria-label="Environmental impact categories"
        className="mb-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.12em] tablet:text-sm"
      >
        {categories.map((category, i) => {
          const isActive = i === selectedIndex;
          return (
            <div key={category._key} className="flex items-center gap-x-3">
              {i > 0 && (
                <span aria-hidden className="text-gray-1/50">
                  |
                </span>
              )}
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedIndex(i)}
                className={twMerge(
                  'cursor-pointer appearance-none border-none bg-transparent px-1 py-1 uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
                  isActive ? 'text-blue' : 'text-gray-1 hover:text-blue',
                )}
              >
                {category.name}
              </button>
            </div>
          );
        })}
      </div>

      <motion.div
        layout={!reduceMotion}
        className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 px-4 tablet:flex-row tablet:items-center tablet:gap-12"
      >
        {/* Icon area: 4-icon grid when collapsed; lead icon when open. */}
        <motion.div
          layout={!reduceMotion}
          className={twMerge(
            'grid shrink-0 place-items-center gap-6 tablet:gap-8',
            selectedIndex === null
              ? 'grid-cols-2 tablet:grid-cols-4'
              : 'grid-cols-1',
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {categories.map((category, i) => {
              if (selectedIndex !== null && i !== selectedIndex) return null;
              const isActive = i === selectedIndex;
              return (
                <motion.button
                  key={category._key}
                  layout={!reduceMotion}
                  layoutId={reduceMotion ? undefined : category._key}
                  type="button"
                  initial={fadeUp.initial}
                  animate={fadeUp.animate}
                  exit={fadeUp.exit}
                  transition={spring}
                  onClick={() => setSelectedIndex(isActive ? null : i)}
                  aria-label={
                    isActive
                      ? `Collapse ${category.name ?? 'category'}`
                      : `Show ${category.name ?? 'category'} stats`
                  }
                  aria-expanded={isActive}
                  className="cursor-pointer appearance-none rounded-full border-none bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <IconCircle category={category} active={isActive} />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Content: 3 stats + summary, cross-faded on category switch. */}
        <AnimatePresence mode="wait" initial={false}>
          {selected && (
            <motion.div
              key={selected._key}
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              exit={fadeUp.exit}
              transition={spring}
              className="flex flex-col items-center gap-6 tablet:items-start"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: reduceMotion ? 0 : 0.08 },
                  },
                }}
                className="flex flex-col items-center gap-6 tablet:flex-row tablet:items-start tablet:gap-10"
              >
                {(selected.stats ?? []).map((stat) => (
                  <motion.div
                    key={stat._key}
                    variants={{
                      hidden: fadeUp.initial,
                      visible: fadeUp.animate,
                    }}
                    transition={spring}
                    className="flex max-w-[16ch] flex-col items-center text-center"
                  >
                    <span className="text-blue text-2xl font-extrabold leading-tight tablet:text-3xl">
                      {displayStat(stat.value)}
                    </span>
                    <span className="text-gray-1 mt-1 text-xs leading-snug">
                      {stat.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
              {selected.summary && (
                <p className="text-blue w-full text-center text-sm tablet:text-base">
                  {selected.summary}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

export default EnvironmentalImpact;
