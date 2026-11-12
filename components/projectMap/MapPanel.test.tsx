import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { MapProject } from '@/lib/mapProjects/display';
import type { PanelView } from '@/lib/mapProjects/selection';
import type { ProjectMapQueryResult } from '@/sanity.types';
import MapPanel from './MapPanel';

const copy = {
  restingPrompt: 'Pick a marker or a category to learn more.',
  categoryDescriptions: {
    energyEfficiency: null,
    solar: 'Solar plants make power on site.',
    solarBess: '',
    bess: '  ',
  },
} satisfies ProjectMapQueryResult;

const newton: MapProject = {
  plantName: 'Newton High School',
  projectName: 'Newton Rooftop Solar',
  projectType: 'Solar',
  projectStatus: 'Operating',
  city: 'Newton',
  state: 'MA',
  entity: ['K-12'],
  technologies: ['Solar PV', 'Carports'],
  financing: ['PPA'],
  size: 1250000,
  sizeMw: 0.5465,
  financingAmount: 1250000,
};

const resting: PanelView = { kind: 'resting' };
const picked: PanelView = { kind: 'project', id: 'newton' };

/** Screen readers hear every change inside this one region. */
const liveRegion = () => {
  const regions = document.querySelectorAll('[aria-live]');
  expect(regions).toHaveLength(1);
  const [region] = regions;
  expect(region).toHaveAttribute('aria-live', 'polite');
  expect(region).toHaveAttribute('aria-atomic', 'true');
  return region as HTMLElement;
};

const terms = () =>
  within(liveRegion())
    .queryAllByRole('term')
    .map((term) => term.textContent);

describe('MapPanel resting view (AC-2.7)', () => {
  it("shows the Studio's resting prompt before any selection", () => {
    render(<MapPanel view={resting} copy={copy} />);
    expect(liveRegion()).toHaveTextContent(copy.restingPrompt);
  });

  it.each([
    ['no Project Map item', null],
    ['a blank prompt', { ...copy, restingPrompt: '  ' }],
  ])('shows nothing for %s', (_case, projectMap) => {
    render(<MapPanel view={resting} copy={projectMap} />);
    expect(liveRegion()).toBeEmptyDOMElement();
  });
});

describe('MapPanel project view (AC-2.4)', () => {
  it('shows the name, the project name, and each field in order', () => {
    render(<MapPanel view={picked} project={newton} copy={copy} />);
    const region = liveRegion();
    expect(within(region).getByText('Newton High School')).toBeVisible();
    expect(within(region).getByText('Newton Rooftop Solar')).toBeVisible();
    expect(terms()).toEqual([
      'Category',
      'Location',
      'Technology / Project Type',
      'Financing',
      'Size',
    ]);
    expect(
      within(region)
        .getAllByRole('definition')
        .map((value) => value.textContent),
    ).toEqual([
      'Solar',
      'Newton, Massachusetts',
      'Solar',
      '$1,250,000',
      '0.5465 MWdc',
    ]);
    expect(region).not.toHaveTextContent(copy.restingPrompt);
  });

  it('drops blank fields and keeps the rest', () => {
    render(
      <MapPanel
        view={picked}
        project={{ ...newton, financingAmount: null, sizeMw: null }}
        copy={copy}
      />,
    );
    expect(terms()).toEqual([
      'Category',
      'Location',
      'Technology / Project Type',
    ]);
  });

  it('falls back to the resting prompt when the picked project is gone', () => {
    render(<MapPanel view={picked} copy={copy} />);
    expect(liveRegion()).toHaveTextContent(copy.restingPrompt);
  });
});

describe('MapPanel category view (AC-2.5)', () => {
  it("shows the category and its editor's description", () => {
    render(
      <MapPanel view={{ kind: 'category', category: 'solar' }} copy={copy} />,
    );
    expect(liveRegion()).toHaveTextContent(
      'Solar' + copy.categoryDescriptions.solar,
    );
  });

  it.each([
    ['a null description', 'energyEfficiency', copy, 'Energy Efficiency'],
    ['an empty description', 'solarBess', copy, 'Solar + Battery'],
    ['a blank description', 'bess', copy, 'Battery'],
    ['no Project Map item', 'solar', null, 'Solar'],
  ] as const)('shows only the category for %s', (_case, category, projectMap, label) => {
    render(
      <MapPanel view={{ kind: 'category', category }} copy={projectMap} />,
    );
    expect(liveRegion().textContent).toBe(label);
  });
});

describe('MapPanel switching (AC-2.7, AC-2.8)', () => {
  it('keeps one polite live region through every switch', () => {
    const { rerender } = render(<MapPanel view={resting} copy={copy} />);
    const region = liveRegion();

    rerender(<MapPanel view={picked} project={newton} copy={copy} />);
    expect(liveRegion()).toBe(region);
    expect(region).toHaveTextContent('Newton High School');

    rerender(
      <MapPanel view={{ kind: 'category', category: 'solar' }} copy={copy} />,
    );
    expect(liveRegion()).toBe(region);
    expect(region).toHaveTextContent(copy.categoryDescriptions.solar);

    rerender(<MapPanel view={resting} copy={copy} />);
    expect(liveRegion()).toBe(region);
    expect(region).toHaveTextContent(copy.restingPrompt);
  });
});

describe('MapPanel from the keyboard', () => {
  it('takes focus, so a keyboard user can scroll a long project (WCAG 2.1.1)', async () => {
    const user = userEvent.setup();
    render(<MapPanel view={picked} project={newton} copy={copy} />);

    await user.tab();
    expect(screen.getByRole('region', { name: 'Map details' })).toHaveFocus();
    expect(liveRegion()).toHaveFocus();
  });
});
