import { describe, expect, it } from 'vitest';
import {
  displayName,
  isPlotted,
  isShown,
  locationOf,
  panelOf,
} from './display';

const project = {
  plantName: 'Newton High School',
  projectName: 'Newton Public Schools',
  title: 'Newton Public Schools',
  projectType: 'Solar',
  projectStatus: 'Operating',
  active: true,
  hiddenAt: null,
  location: { lat: 42.33, lng: -71.21 },
  city: 'Newton',
  state: 'Massachusetts',
  entity: ['K-12 '],
  financing: ['PPA'],
  size: 1234567,
  technologies: ['Solar'],
  sizeMw: 1.5092,
  financingAmount: 1250000,
};

describe('isPlotted (AC-2.1, AC-4.5)', () => {
  it('plots an active, located, categorized project that is not hidden', () => {
    expect(isPlotted(project)).toBe(true);
  });

  it.each([null, undefined])('plots a project whose Active is %s', (active) => {
    expect(isPlotted({ ...project, active })).toBe(true);
  });

  it('skips an inactive project', () => {
    expect(isPlotted({ ...project, active: false })).toBe(false);
  });

  it('never plots a hidden project', () => {
    expect(isPlotted({ ...project, hiddenAt: '2026-11-04T12:00:00Z' })).toBe(
      false,
    );
  });

  it.each([
    [null],
    [{ lat: null, lng: -71.21 }],
    [{ lat: 42.33 }],
    [{ lat: Number.NaN, lng: -71.21 }],
  ])('skips a project located at %j', (location) => {
    expect(isPlotted({ ...project, location })).toBe(false);
  });

  it('skips a project without a category', () => {
    expect(isPlotted({ ...project, projectType: 'Wind' })).toBe(false);
  });
});

describe('isShown (AC-4.5)', () => {
  it('shows an active project without a location or category', () => {
    expect(isShown({ ...project, location: null, projectType: 'Wind' })).toBe(
      true,
    );
  });

  it('hides an inactive project', () => {
    expect(isShown({ ...project, active: false })).toBe(false);
  });

  it('hides a hidden project', () => {
    expect(isShown({ ...project, hiddenAt: '2026-11-04T12:00:00Z' })).toBe(
      false,
    );
  });
});

describe('displayName', () => {
  it('uses the Plant Name first', () => {
    expect(displayName(project)).toBe('Newton High School');
  });

  it('falls back to the Project Name when the Plant Name is blank', () => {
    expect(displayName({ ...project, plantName: '  ' })).toBe(
      'Newton Public Schools',
    );
  });

  it('falls back to the old title for a website-only project', () => {
    expect(
      displayName({
        plantName: null,
        projectName: null,
        title: ' Fort Smith ',
      }),
    ).toBe('Fort Smith');
  });

  it('gives an empty name when every name is blank', () => {
    expect(displayName({})).toBe('');
  });
});

describe('locationOf', () => {
  it('joins the city and the full state name', () => {
    expect(locationOf({ city: 'Newton', state: 'MA' })).toBe(
      'Newton, Massachusetts',
    );
  });

  it('gives the state alone when the city is blank', () => {
    expect(locationOf({ city: ' ', state: 'Arkansas' })).toBe('Arkansas');
  });

  it('gives no location when both are blank', () => {
    expect(locationOf({ city: null, state: '' })).toBeNull();
  });
});

describe('panelOf (AC-2.4, G2)', () => {
  // Status and the website's old Entity type, Technologies, Financing, and Size ($) stay off.
  it("shows the name, the project name, and BlueIQ's fields in order", () => {
    expect(panelOf(project)).toEqual({
      name: 'Newton High School',
      projectName: 'Newton Public Schools',
      category: 'solar',
      fields: [
        { label: 'Category', value: 'Solar' },
        { label: 'Location', value: 'Newton, Massachusetts' },
        { label: 'Technology / Project Type', value: 'Solar' },
        { label: 'Financing', value: '$1,250,000' },
        { label: 'Size', value: '1.5092 MWdc' },
      ],
    });
  });

  it("shows BlueIQ's Other beside the category that Technologies give", () => {
    expect(
      panelOf({
        ...project,
        projectType: ' Other ',
        technologies: ['Solar and EV Chargers'],
      }).fields.slice(0, 3),
    ).toEqual([
      { label: 'Category', value: 'Solar' },
      { label: 'Location', value: 'Newton, Massachusetts' },
      { label: 'Technology / Project Type', value: 'Other' },
    ]);
  });

  it('writes large sizes and cents in full', () => {
    const { fields } = panelOf({
      ...project,
      sizeMw: 1234.5678,
      financingAmount: 99.5,
    });
    expect(fields).toContainEqual({ label: 'Size', value: '1,234.5678 MWdc' });
    expect(fields).toContainEqual({ label: 'Financing', value: '$99.50' });
  });

  it('leaves out the project name when it matches the name', () => {
    expect(
      panelOf({ ...project, plantName: null, projectName: 'Newton' })
        .projectName,
    ).toBeNull();
    expect(
      panelOf({ ...project, plantName: 'Newton', projectName: ' newton ' })
        .projectName,
    ).toBeNull();
  });

  // A website-only project has none of BlueIQ's fields (G3).
  it('drops blank fields', () => {
    expect(
      panelOf({
        ...project,
        projectType: ' ',
        city: null,
        state: ' ',
        sizeMw: null,
        financingAmount: undefined,
      }).fields,
    ).toEqual([{ label: 'Category', value: 'Solar' }]);
  });

  it('trims the Technology / Project Type', () => {
    expect(
      panelOf({ ...project, projectType: ' Solar  +  Battery ' }).fields,
    ).toContainEqual({
      label: 'Technology / Project Type',
      value: 'Solar + Battery',
    });
  });
});
