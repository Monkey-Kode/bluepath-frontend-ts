import { act, fireEvent, renderHook } from '@testing-library/react';
import {
  destroyIntersectionMocking,
  mockAllIsIntersecting,
  setupIntersectionMocking,
} from 'react-intersection-observer/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoryKey } from '@/lib/categories';
import type { MapProject } from '@/lib/mapProjects/display';
import {
  PREVIEW_LOOPS,
  PREVIEW_STEP_MS,
  previewCategories,
  useCategoryPreview,
} from './useCategoryPreview';

const ALL: CategoryKey[] = ['energyEfficiency', 'solar', 'solarBess', 'bess'];

let section: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  setupIntersectionMocking(vi.fn);
  section = document.createElement('section');
  document.body.append(section);
});

afterEach(() => {
  section.remove();
  destroyIntersectionMocking();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function preview(categories = ALL, ready = true) {
  return renderHook(
    ({ ready }) => useCategoryPreview({ current: section }, categories, ready),
    { initialProps: { ready } },
  );
}

/** The mock reports the share of the map on screen. Act applies the state change at once. */
const onScreen = (share: boolean | number = true) =>
  act(() => {
    mockAllIsIntersecting(share);
  });

const step = () =>
  act(() => {
    vi.advanceTimersByTime(PREVIEW_STEP_MS);
  });

describe('previewCategories', () => {
  const at = { lat: 40, lng: -100 };
  const project = (fields: Partial<MapProject>): MapProject => ({
    active: true,
    hiddenAt: null,
    location: at,
    ...fields,
  });

  it('keeps the categories with a plotted marker, in legend order', () => {
    expect(
      previewCategories([
        project({ projectType: 'BESS' }),
        project({ projectType: 'Solar' }),
        project({ projectType: 'Energy Efficiency', location: null }),
        project({ projectType: 'Solar + BESS', hiddenAt: '2026-11-01' }),
      ]),
    ).toEqual(['solar', 'bess']);
  });
});

describe('useCategoryPreview', () => {
  it('cycles through the categories three times, on screen, then ends on the full map', () => {
    const { result } = preview();
    expect(result.current.preview).toBeNull();

    onScreen();
    for (let loop = 0; loop < PREVIEW_LOOPS; loop++) {
      for (const category of ALL) {
        expect(result.current.preview).toBe(category);
        step();
      }
    }
    expect(result.current.preview).toBeNull();

    // It runs once per visit.
    onScreen();
    expect(result.current.preview).toBeNull();
  });

  it('waits until half the map is on screen', () => {
    const { result } = preview();
    onScreen(0.3);
    expect(result.current.preview).toBeNull();

    onScreen(0.6);
    expect(result.current.preview).toBe('energyEfficiency');
  });

  it('waits for the map to be ready', () => {
    const { result, rerender } = preview(ALL, false);
    onScreen();
    expect(result.current.preview).toBeNull();

    rerender({ ready: true });
    onScreen();
    expect(result.current.preview).toBe('energyEfficiency');
  });

  it('holds the category through a press, and ends a task after the release', () => {
    const { result } = preview();
    onScreen();

    act(() => {
      fireEvent.pointerDown(section);
      // The press focuses what it hits.
      fireEvent.focusIn(section);
    });
    step();
    expect(result.current.preview).toBe('energyEfficiency');

    // The click follows the release in the same task, so the look holds until it lands.
    act(() => {
      fireEvent.pointerUp(window);
    });
    expect(result.current.preview).toBe('energyEfficiency');
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.preview).toBeNull();
  });

  it.each([
    ['a key', (target: Element) => fireEvent.keyDown(target, { key: 'Tab' })],
    ['focus', (target: Element) => fireEvent.focusIn(target)],
  ])('ends at once on %s in the map', (_case, use) => {
    const { result } = preview();
    onScreen();
    expect(result.current.preview).toBe('energyEfficiency');

    act(() => {
      use(section);
    });
    expect(result.current.preview).toBeNull();
    step();
    expect(result.current.preview).toBeNull();
  });

  it('never starts once the visitor has used the map', () => {
    const { result } = preview();
    act(() => {
      fireEvent.pointerDown(section);
    });
    onScreen();
    expect(result.current.preview).toBeNull();
  });

  it('ends for good on stop', () => {
    const { result } = preview();
    onScreen();
    expect(result.current.preview).toBe('energyEfficiency');

    act(() => result.current.stop());
    expect(result.current.preview).toBeNull();
    onScreen();
    step();
    expect(result.current.preview).toBeNull();
  });

  it('never runs with reduced motion on (NFR-002)', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      })),
    );
    const { result } = preview();
    // It never even watches the map.
    expect(window.IntersectionObserver).not.toHaveBeenCalled();
    expect(result.current.preview).toBeNull();
  });

  it('skips a map with one category, where a preview shows nothing new', () => {
    const { result } = preview(['solar']);
    onScreen();
    expect(result.current.preview).toBeNull();
  });
});
