import { describe, expect, it } from 'vitest';
import type { MapProject } from './display';
import type { StateOutlines } from './outlines';
import { countByState, SHADES, shadeFor } from './shading';

/** WCAG relative luminance, so "darker" has one meaning in these tests. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const shade = (count: number) => {
  const color = shadeFor(count);
  if (!color) throw new Error(`${count} projects got no shade.`);
  return color;
};

describe('shadeFor (AC-2.2, D-3)', () => {
  it('gives no shade to a state with no projects, so it keeps the base fill', () => {
    expect(shadeFor(0)).toBeNull();
  });

  it('starts a new shade at 1, 5, 10, 20, 40, and 70 projects', () => {
    expect(SHADES.map((step) => step.from)).toEqual([1, 5, 10, 20, 40, 70]);
    for (const [i, step] of SHADES.entries()) {
      expect(shadeFor(step.from)).toBe(step.color);
      if (i > 0) expect(shadeFor(step.from - 1)).toBe(SHADES[i - 1].color);
    }
  });

  it('never makes a state darker than a state with fewer projects', () => {
    for (let count = 1; count < 150; count++) {
      expect(luminance(shade(count + 1))).toBeGreaterThanOrEqual(
        luminance(shade(count)),
      );
    }
  });

  it('gives each step a lighter shade than the step before', () => {
    for (let i = 1; i < SHADES.length; i++) {
      expect(luminance(SHADES[i].color)).toBeGreaterThan(
        luminance(SHADES[i - 1].color),
      );
    }
  });

  it('uses the lightest shade above 100 projects', () => {
    const lightest = SHADES[SHADES.length - 1].color;
    expect(shadeFor(101)).toBe(lightest);
    expect(shadeFor(1000)).toBe(lightest);
  });
});

describe('countByState (FR-003)', () => {
  const square = (x0: number, x1: number) => [
    [x0, 0],
    [x1, 0],
    [x1, 1],
    [x0, 1],
    [x0, 0],
  ];
  const outlines = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { mask: true },
        geometry: { type: 'Polygon', coordinates: [square(-50, 50)] },
      },
      {
        type: 'Feature',
        properties: { name: 'Westland' },
        geometry: { type: 'Polygon', coordinates: [square(0, 1)] },
      },
      {
        type: 'Feature',
        properties: { name: 'Eastland' },
        geometry: { type: 'Polygon', coordinates: [square(1, 2)] },
      },
    ],
  } satisfies StateOutlines;

  const at = (lng: number, extra: Partial<MapProject> = {}): MapProject => ({
    projectType: 'Solar',
    location: { lat: 0.5, lng },
    ...extra,
  });

  it('counts plotted projects by the state their coordinates fall in', () => {
    const counts = countByState(outlines, [
      at(0.5, { projectType: 'Energy Efficiency' }),
      at(0.5, { projectType: 'BESS' }),
      at(1.5, { projectType: 'Solar + BESS' }),
      // The State field never decides the count.
      at(1.5, { state: 'Westland' }),
    ]);
    expect(Object.fromEntries(counts)).toEqual({ Westland: 2, Eastland: 2 });
  });

  it('leaves out projects the map does not plot', () => {
    const counts = countByState(outlines, [
      at(0.5),
      at(0.5, { active: false }),
      at(0.5, { hiddenAt: '2026-11-04T12:00:00Z' }),
      at(0.5, { projectType: 'Wind' }),
      at(0.5, { location: { lat: null, lng: 0.5 } }),
    ]);
    expect(Object.fromEntries(counts)).toEqual({ Westland: 1 });
  });

  it('counts nothing for a project outside every state', () => {
    expect(countByState(outlines, [at(20)]).size).toBe(0);
  });
});
