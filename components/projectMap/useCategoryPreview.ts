'use client';

import { type RefObject, useCallback, useEffect, useState } from 'react';
import { observe } from 'react-intersection-observer';
import { CATEGORIES, type CategoryKey, categoryOf } from '@/lib/categories';
import { isPlotted, type MapProject } from '@/lib/mapProjects/display';
import { prefersReducedMotion } from '@/lib/reducedMotion';

/** How long the preview shows each category. Four categories take 6 seconds. */
export const PREVIEW_STEP_MS = 1500;

/** Marks the preview's stop button. Using it never counts as using the map. */
export const PREVIEW_STOP = 'data-preview-stop';

/** The preview starts once this share of the map is on screen. */
const IN_VIEW = 0.5;

/**
 * Where the preview is. `held` keeps the category on show while a press lasts. Ending the preview
 * mid-press would bring back hidden markers, and one of them could catch the click meant for the
 * marker under the pointer.
 */
type Phase = 'waiting' | 'running' | 'held' | 'done';

/** The release ends a held preview after the click that follows it. */
const RELEASE_EVENTS = ['pointerup', 'pointercancel'] as const;

const onStopButton = (event: Event) =>
  event.target instanceof Element &&
  event.target.closest(`[${PREVIEW_STOP}]`) !== null;

/** The categories that have a plotted marker, in legend order. */
export function previewCategories(
  projects: readonly MapProject[],
): CategoryKey[] {
  const plotted = new Set(
    projects.filter(isPlotted).map((project) => categoryOf(project)),
  );
  return CATEGORIES.map(({ key }) => key).filter((key) => plotted.has(key));
}

/**
 * Shows each category on its own, once, to hint that the map responds (Nov 13). It starts when
 * the map is ready and half on screen. It ends on the full map after one pass. The first use of
 * the map ends it for good, as does the stop button (WCAG 2.2.2). A press, a key, or focus counts
 * as use. A wheel or keyboard scroll doesn't, but a touch swipe that starts on the map does. It
 * never runs with reduced motion on (NFR-002).
 */
export function useCategoryPreview(
  section: RefObject<HTMLElement | null>,
  categories: readonly CategoryKey[],
  ready: boolean,
) {
  const [phase, setPhase] = useState<Phase>('waiting');
  const [step, setStep] = useState(0);
  const stop = useCallback(() => setPhase('done'), []);

  // A visitor who starts using the map never sees the preview, even one still waiting to start.
  const listening = phase !== 'done';
  useEffect(() => {
    const element = section.current;
    if (!element || !listening) return;
    let release: number | undefined;
    const onPress = (event: Event) => {
      if (!onStopButton(event))
        setPhase((now) => (now === 'running' ? 'held' : 'done'));
    };
    // A press focuses what it hits, so focus during a press doesn't end the preview yet.
    const onKeyOrFocus = (event: Event) => {
      if (!onStopButton(event))
        setPhase((now) => (now === 'held' ? now : 'done'));
    };
    // The browser sends the click after the release, in the same task. Ending a task later lets
    // the click reach the marker that the visitor saw.
    const onRelease = () => {
      window.clearTimeout(release);
      release = window.setTimeout(() =>
        setPhase((now) => (now === 'held' ? 'done' : now)),
      );
    };
    element.addEventListener('pointerdown', onPress);
    element.addEventListener('keydown', onKeyOrFocus);
    element.addEventListener('focusin', onKeyOrFocus);
    // The release can happen outside the map, after a drag.
    for (const type of RELEASE_EVENTS) window.addEventListener(type, onRelease);
    return () => {
      window.clearTimeout(release);
      element.removeEventListener('pointerdown', onPress);
      element.removeEventListener('keydown', onKeyOrFocus);
      element.removeEventListener('focusin', onKeyOrFocus);
      for (const type of RELEASE_EVENTS)
        window.removeEventListener(type, onRelease);
    };
  }, [section, listening]);

  const startable = ready && phase === 'waiting' && categories.length > 1;
  useEffect(() => {
    const element = section.current;
    if (!startable || !element || prefersReducedMotion()) return;
    // `inView` turns true only once half the map shows. Without IntersectionObserver, it stays
    // false. The cleanup stops watching once the preview starts.
    return observe(
      element,
      (inView) => {
        if (inView) setPhase('running');
      },
      { threshold: IN_VIEW },
      false,
    );
  }, [section, startable]);

  useEffect(() => {
    if (phase !== 'running') return;
    const timer = window.setTimeout(() => {
      if (step + 1 < categories.length) setStep(step + 1);
      else setPhase('done');
    }, PREVIEW_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [phase, step, categories.length]);

  return {
    /** The category on show, or null outside the preview. */
    preview:
      phase === 'running' || phase === 'held'
        ? (categories[step] ?? null)
        : null,
    stop,
  };
}
