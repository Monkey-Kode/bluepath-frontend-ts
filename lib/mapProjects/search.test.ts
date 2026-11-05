import { describe, expect, it } from 'vitest';
import type { StateOutlines } from './outlines';
import {
  isZip,
  matchProjects,
  matchStates,
  nearestProjects,
  projectsInState,
  type SearchProject,
  stateByOutlines,
} from './search';

const project = (
  id: string,
  fields: Partial<SearchProject> = {},
): SearchProject => ({
  id,
  plantName: null,
  projectName: null,
  title: null,
  projectType: 'Solar',
  active: true,
  hiddenAt: null,
  location: { lat: 40, lng: -100 },
  address: null,
  city: null,
  state: null,
  ...fields,
});

const FORD = project('ford', {
  plantName: 'Ford Motor Company',
  address: '1 American Rd, Dearborn, MI 48126',
  state: 'Michigan',
  location: { lat: 42.31, lng: -83.21 },
});
const STANFORD = project('stanford', {
  title: 'Stanford Solar',
  state: 'CA',
  location: { lat: 37.43, lng: -122.17 },
});
const PHOENIX = project('phoenix', {
  projectName: 'Cartwright School',
  address: '6308 W Campbell Ave, Phoenix, Arizona 85033',
  state: 'Arizona',
  projectType: 'Energy Efficiency',
  location: { lat: 33.5, lng: -112.2 },
});
const HIDDEN = project('hidden', {
  plantName: 'Ford Hidden Plant',
  hiddenAt: '2026-11-01',
});
const INACTIVE = project('inactive', {
  plantName: 'Ford Inactive Plant',
  active: false,
});
const UNPLOTTED = project('unplotted', {
  plantName: 'Ford Without A Pin',
  location: null,
});
const UNCATEGORIZED = project('uncategorized', {
  plantName: 'Ford Mystery',
  projectType: 'Wind',
});

const ALL = [
  FORD,
  STANFORD,
  PHOENIX,
  HIDDEN,
  INACTIVE,
  UNPLOTTED,
  UNCATEGORIZED,
];

const ids = (results: readonly { id: string }[]) => results.map((r) => r.id);

describe('plain search (AC-9.2)', () => {
  it('lists plotted projects by name, and a name that starts with the text comes first', () => {
    expect(ids(matchProjects(ALL, 'ford'))).toEqual(['ford', 'stanford']);
  });

  it('matches a place in the address, city, or state', () => {
    expect(ids(matchProjects(ALL, 'phoenix'))).toEqual(['phoenix']);
    expect(ids(matchProjects(ALL, 'michigan'))).toEqual(['ford']);
    // A two-letter code matches its full state name.
    expect(ids(matchProjects(ALL, 'california'))).toEqual(['stanford']);
  });

  it('ignores case and extra spaces', () => {
    expect(ids(matchProjects(ALL, '  FORD   motor '))).toEqual(['ford']);
  });

  it('never lists a hidden, inactive, unplotted, or uncategorized project', () => {
    expect(ids(matchProjects(ALL, 'ford'))).not.toEqual(
      expect.arrayContaining([
        'hidden',
        'inactive',
        'unplotted',
        'uncategorized',
      ]),
    );
    expect(matchProjects(ALL, 'ford')).toHaveLength(2);
  });

  it('waits for two characters', () => {
    expect(matchProjects(ALL, 'f')).toEqual([]);
    expect(matchProjects(ALL, ' f ')).toEqual([]);
  });

  it('lists at most 10 projects', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      project(`p${i}`, { plantName: `Sun Farm ${i}` }),
    );
    expect(matchProjects(many, 'sun')).toHaveLength(10);
  });

  it('gives each row a name, a category, and a place', () => {
    expect(matchProjects(ALL, 'cartwright')).toEqual([
      {
        id: 'phoenix',
        name: 'Cartwright School',
        category: 'energyEfficiency',
        place: 'Arizona',
      },
    ]);
  });
});

describe('state search (AC-9.4)', () => {
  it('matches a two-letter code or the start of a name, with its plotted count', () => {
    expect(matchStates(ALL, 'ca')).toEqual([
      { code: 'CA', name: 'California', count: 1 },
    ]);
    expect(matchStates(ALL, 'calif')).toEqual([
      { code: 'CA', name: 'California', count: 1 },
    ]);
  });

  it('matches the start of any word, and offers a state with no projects at zero', () => {
    expect(matchStates(ALL, 'new').map((s) => [s.name, s.count])).toEqual([
      ['New Hampshire', 0],
      ['New Jersey', 0],
      ['New Mexico', 0],
      ['New York', 0],
    ]);
    expect(matchStates(ALL, 'carolina').map((s) => s.code)).toEqual([
      'NC',
      'SC',
    ]);
  });

  it('counts only plotted projects', () => {
    expect(matchStates(ALL, 'mi')).toContainEqual({
      code: 'MI',
      name: 'Michigan',
      count: 1,
    });
  });

  it('waits for two characters', () => {
    expect(matchStates(ALL, 'c')).toEqual([]);
  });

  it('lists every plotted project in a state, whatever its spelling', () => {
    const another = project('another', {
      plantName: 'Alpha Solar',
      state: 'ca',
    });
    expect(ids(projectsInState([...ALL, another], 'California'))).toEqual([
      'another',
      'stanford',
    ]);
  });
});

describe('ZIP search (AC-9.5)', () => {
  it('accepts exactly five digits', () => {
    expect(isZip('85033')).toBe(true);
    expect(isZip(' 85033 ')).toBe(true);
    expect(isZip('8503')).toBe(false);
    expect(isZip('850331')).toBe(false);
    expect(isZip('8503a')).toBe(false);
  });

  it('lists the nearest plotted projects first, with miles', () => {
    const near = nearestProjects(ALL, { lat: 33.45, lng: -112.07 });
    expect(ids(near)).toEqual(['phoenix', 'stanford', 'ford']);
    expect(near[0].miles).toBeGreaterThan(5);
    expect(near[0].miles).toBeLessThan(10);
    // Phoenix to Palo Alto is about 650 miles.
    expect(near[1].miles).toBeGreaterThan(600);
    expect(near[1].miles).toBeLessThan(700);
  });

  it('lists at most 10 projects', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      project(`p${i}`, { location: { lat: 40 + i, lng: -100 } }),
    );
    expect(nearestProjects(many, { lat: 40, lng: -100 })).toHaveLength(10);
  });
});

describe("a project's state for State search (AC-9.4, AC-2.2)", () => {
  const square = (west: number, south: number, east: number, north: number) => [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ];
  const outlines: StateOutlines = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Arkansas' },
        geometry: { type: 'Polygon', coordinates: square(-95, 33, -89, 37) },
      },
    ],
  };
  // The State field says Alaska, but the pin sits in Arkansas, as with one legacy address.
  const typo = project('typo', {
    plantName: 'Little Rock Solar',
    state: 'Alaska',
    location: { lat: 34.75, lng: -92.29 },
  });
  const offshore = project('offshore', {
    plantName: 'Offshore Solar',
    state: 'Arkansas',
    location: { lat: 20, lng: -60 },
  });

  it("follows the pin's state, as the shading does", () => {
    const stateOf = stateByOutlines(outlines);
    expect(matchStates([typo], 'ark', stateOf)).toEqual([
      { code: 'AR', name: 'Arkansas', count: 1 },
    ]);
    expect(matchStates([typo], 'alaska', stateOf)).toEqual([
      { code: 'AK', name: 'Alaska', count: 0 },
    ]);
    expect(ids(projectsInState([typo], 'Arkansas', stateOf))).toEqual(['typo']);
  });

  it('falls back to the State field outside every outline', () => {
    const stateOf = stateByOutlines(outlines);
    expect(ids(projectsInState([offshore], 'Arkansas', stateOf))).toEqual([
      'offshore',
    ]);
  });

  it('uses the State field when the outlines failed to load', () => {
    expect(
      ids(projectsInState([typo], 'Alaska', stateByOutlines(null))),
    ).toEqual(['typo']);
  });
});
