import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CATEGORIES } from '@/lib/categories';
import { idle, type Selection } from '@/lib/mapProjects/selection';
import { contrast, luminance } from '@/test/contrast';
import MapLegend from './MapLegend';

const entries = () =>
  within(
    screen.getByRole('list', { name: 'Filter the map by category' }),
  ).getAllByRole('button');

const entry = (name: string) => screen.getByRole('button', { name });

const show = (selection: Selection, onPick = vi.fn()) => {
  render(<MapLegend selection={selection} onPick={onPick} />);
  return onPick;
};

describe('MapLegend entries (AC-2.3)', () => {
  it('lists the four categories in legend order, each as a button', () => {
    show(idle);
    const names = ['Energy Efficiency', 'Solar', 'Solar + Battery', 'Battery'];
    expect(entries()).toHaveLength(names.length);
    for (const [i, button] of entries().entries()) {
      expect(button).toHaveAccessibleName(names[i]);
    }
  });

  it('colors each swatch from the definition that the markers read', () => {
    show(idle);
    for (const [i, button] of entries().entries()) {
      const swatch = button.querySelector('[aria-hidden="true"]');
      expect(swatch).toHaveStyle({ backgroundColor: CATEGORIES[i].color });
    }
  });
});

describe('MapLegend states (AC-2.4, AC-2.5, AC-2.8)', () => {
  it('presses no entry before any selection', () => {
    show(idle);
    for (const button of entries()) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('data-look', 'normal');
    }
  });

  it('presses and raises only the filter entry, and fades the rest', () => {
    show({ filter: 'solar', project: null });
    expect(entry('Solar')).toHaveAttribute('aria-pressed', 'true');
    expect(entry('Solar')).toHaveAttribute('data-look', 'filter');
    for (const name of ['Energy Efficiency', 'Solar + Battery', 'Battery']) {
      expect(entry(name)).toHaveAttribute('aria-pressed', 'false');
      expect(entry(name)).toHaveAttribute('data-look', 'faded');
    }
  });

  it("bolds a picked project's category without pressing it", () => {
    show({ filter: null, project: { id: 'a', category: 'bess' } });
    expect(entry('Battery')).toHaveAttribute('data-look', 'match');
    expect(entry('Solar')).toHaveAttribute('data-look', 'faded');
    for (const button of entries()) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('reports a pick by pointer, Enter, and Space', async () => {
    const user = userEvent.setup();
    const onPick = show(idle);
    await user.tab();
    expect(entry('Energy Efficiency')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenLastCalledWith('energyEfficiency');

    await user.tab();
    expect(entry('Solar')).toHaveFocus();
    await user.keyboard(' ');
    expect(onPick).toHaveBeenLastCalledWith('solar');

    await user.click(entry('Solar + Battery'));
    expect(onPick).toHaveBeenLastCalledWith('solarBess');
    expect(onPick).toHaveBeenCalledTimes(3);
  });
});

describe('legend text colors (AC-2.4, D-20)', () => {
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../app/globals.css'),
    'utf8',
  );
  const token = (name: string) => {
    const value = css.match(
      new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`),
    )?.[1];
    if (!value) throw new Error(`globals.css has no --color-${name} token.`);
    return value;
  };

  it('meets WCAG AA on white, faded entries included', () => {
    for (const name of ['legend', 'legend-faded']) {
      expect(contrast(token(name), '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('makes faded text lighter than normal text', () => {
    expect(luminance(token('legend-faded'))).toBeGreaterThan(
      luminance(token('legend')),
    );
  });
});
