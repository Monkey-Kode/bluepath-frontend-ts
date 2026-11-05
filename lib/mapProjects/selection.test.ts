import { describe, expect, it } from 'vitest';
import {
  type Action,
  idle,
  legendLook,
  markerLook,
  panelView,
  type Selection,
  select,
} from './selection';

const solarA = { id: 'a', category: 'solar' } as const;
const solarB = { id: 'b', category: 'solar' } as const;
const bessC = { id: 'c', category: 'bess' } as const;

const run = (...actions: Action[]): Selection => actions.reduce(select, idle);
const pick = (project: typeof solarA | typeof solarB | typeof bessC) =>
  ({ type: 'pickMarker', project }) as const;
const legend = (category: 'solar' | 'bess') =>
  ({ type: 'pickLegend', category }) as const;

describe('select (AC-2.6)', () => {
  it('starts with nothing selected', () => {
    expect(idle).toEqual({ filter: null, project: null });
  });

  it('selects a picked marker', () => {
    expect(run(pick(solarA))).toEqual({ filter: null, project: solarA });
  });

  it('clears when the same marker is picked again', () => {
    expect(run(pick(solarA), pick(solarA))).toEqual(idle);
  });

  it('switches to a different marker', () => {
    expect(run(pick(solarA), pick(bessC))).toEqual({
      filter: null,
      project: bessC,
    });
  });

  it('turns on a filter for a picked legend entry', () => {
    expect(run(legend('solar'))).toEqual({ filter: 'solar', project: null });
  });

  it('clears when the same legend entry is picked again', () => {
    expect(run(legend('solar'), legend('solar'))).toEqual(idle);
  });

  it('switches to a different legend entry', () => {
    expect(run(legend('solar'), legend('bess'))).toEqual({
      filter: 'bess',
      project: null,
    });
  });

  it('replaces a selected project with the picked category filter', () => {
    expect(run(pick(solarA), legend('bess'))).toEqual({
      filter: 'bess',
      project: null,
    });
  });

  it('keeps the filter and shows a marker picked while it is on', () => {
    expect(run(legend('solar'), pick(solarB))).toEqual({
      filter: 'solar',
      project: solarB,
    });
  });

  it('goes back to the filter when its picked marker is picked again', () => {
    expect(run(legend('solar'), pick(solarB), pick(solarB))).toEqual({
      filter: 'solar',
      project: null,
    });
  });

  it('clears everything when the filter entry is picked with a project shown', () => {
    expect(run(legend('solar'), pick(solarB), legend('solar'))).toEqual(idle);
  });

  it.each([
    'clickMap',
    'escape',
  ] as const)('clears a project and a filter on %s', (type) => {
    expect(run(pick(solarA), { type })).toEqual(idle);
    expect(run(legend('solar'), pick(solarB), { type })).toEqual(idle);
  });

  it('keeps the same state object when nothing changes', () => {
    expect(select(idle, { type: 'escape' })).toBe(idle);
  });
});

describe('a search pick (AC-9.3)', () => {
  const result = (project: typeof solarA | typeof bessC) =>
    ({ type: 'pickResult', project }) as const;

  it('selects the picked project', () => {
    expect(run(result(solarA))).toEqual({ filter: null, project: solarA });
  });

  it('keeps the project selected when it is picked again', () => {
    expect(run(result(solarA), result(solarA))).toEqual({
      filter: null,
      project: solarA,
    });
    expect(run(pick(solarA), result(solarA))).toEqual({
      filter: null,
      project: solarA,
    });
  });

  it("keeps a filter that shows the project's category", () => {
    expect(run(legend('solar'), result(solarA))).toEqual({
      filter: 'solar',
      project: solarA,
    });
  });

  it("clears a filter that hides the project's category", () => {
    expect(run(legend('bess'), result(solarA))).toEqual({
      filter: null,
      project: solarA,
    });
  });
});

describe('markerLook (AC-2.4, AC-2.5)', () => {
  it('shows every marker normally before any selection', () => {
    expect(markerLook(idle, solarA)).toBe('normal');
  });

  it('raises the picked marker and dims other categories only', () => {
    const state = run(pick(solarA));
    expect(markerLook(state, solarA)).toBe('selected');
    expect(markerLook(state, solarB)).toBe('normal');
    expect(markerLook(state, bessC)).toBe('dimmed');
  });

  it('hides other categories while a filter is on, rather than dimming them', () => {
    const state = run(legend('solar'));
    expect(markerLook(state, solarA)).toBe('normal');
    expect(markerLook(state, bessC)).toBe('hidden');
  });

  it('raises a marker picked while a filter is on', () => {
    const state = run(legend('solar'), pick(solarB));
    expect(markerLook(state, solarB)).toBe('selected');
    expect(markerLook(state, solarA)).toBe('normal');
    expect(markerLook(state, bessC)).toBe('hidden');
  });
});

describe('legendLook (AC-2.4, AC-2.5)', () => {
  it('shows every entry normally before any selection', () => {
    expect(legendLook(idle, 'solar')).toBe('normal');
  });

  it("bolds the picked project's category and fades the rest", () => {
    const state = run(pick(solarA));
    expect(legendLook(state, 'solar')).toBe('match');
    expect(legendLook(state, 'bess')).toBe('faded');
  });

  it('raises the filter entry and fades the rest', () => {
    for (const state of [
      run(legend('bess')),
      run(legend('bess'), pick(bessC)),
    ]) {
      expect(legendLook(state, 'bess')).toBe('filter');
      expect(legendLook(state, 'solar')).toBe('faded');
    }
  });
});

describe('panelView (AC-2.4, AC-2.5, AC-2.7)', () => {
  it('shows the resting prompt before any selection', () => {
    expect(panelView(idle)).toEqual({ kind: 'resting' });
  });

  it('shows a picked project, even while a filter is on', () => {
    expect(panelView(run(pick(solarA)))).toEqual({ kind: 'project', id: 'a' });
    expect(panelView(run(legend('solar'), pick(solarB)))).toEqual({
      kind: 'project',
      id: 'b',
    });
  });

  it("shows the filter's category description", () => {
    expect(panelView(run(legend('bess')))).toEqual({
      kind: 'category',
      category: 'bess',
    });
  });
});
