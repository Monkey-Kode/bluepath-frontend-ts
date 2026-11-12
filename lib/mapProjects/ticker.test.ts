import { describe, expect, it } from 'vitest';
import { type TickerProject, tickerEntries } from './ticker';

const plant = (
  _id: string,
  fields: Omit<TickerProject, '_id'> = {},
): TickerProject => ({
  _id,
  projectId: 'P-100',
  projectName: 'Lincoln Community Energy',
  projectType: 'Solar',
  active: true,
  hiddenAt: null,
  state: 'Nebraska',
  entity: ['Municipal'],
  size: 1000,
  technologies: ['Solar PV'],
  ...fields,
});

describe('tickerEntries (AC-4.7, D-13)', () => {
  it('gives plants that share a Project ID one entry, with sizes added and lists combined', () => {
    const entries = tickerEntries([
      plant('plant-1', {
        entity: ['Municipal', ' K-12 '],
        size: 1200,
        technologies: ['Solar PV'],
      }),
      plant('plant-2', {
        entity: ['K-12'],
        size: 800,
        technologies: ['Solar PV', 'Battery storage'],
      }),
    ]);
    expect(entries).toEqual([
      {
        key: 'project:P-100',
        ids: ['plant-1', 'plant-2'],
        heading: 'Nebraska: Municipal, K-12',
        entityTypes: ['Municipal', 'K-12'],
        technologies: 'Solar PV, Battery storage',
        size: '$2,000',
      },
    ]);
  });

  it('lists each state once, from the address when State is blank', () => {
    const [entry] = tickerEntries([
      plant('plant-1', { state: 'NE' }),
      plant('plant-2', {
        state: null,
        address: '1 Grand Ave, Des Moines, IA 50309',
      }),
      plant('plant-3', { state: ' nebraska ' }),
    ]);
    expect(entry?.heading).toBe('Nebraska, Iowa: Municipal');
  });

  it("shows a plant's Project Type when its Technologies is blank", () => {
    const [entry] = tickerEntries([
      plant('plant-1', { technologies: [' ', null], projectType: 'BESS' }),
      plant('plant-2', { technologies: ['Solar PV'] }),
    ]);
    expect(entry?.technologies).toBe('BESS, Solar PV');
  });

  it('leaves out blank values, so no lone "$" or ": " appears', () => {
    const [entry] = tickerEntries([
      plant('plant-1', {
        state: null,
        entity: null,
        size: null,
        technologies: null,
        projectType: ' ',
      }),
    ]);
    expect(entry).toMatchObject({
      heading: '',
      entityTypes: [],
      technologies: '',
      size: '',
    });

    const [stateOnly] = tickerEntries([plant('plant-2', { entity: [] })]);
    expect(stateOnly?.heading).toBe('Nebraska');
  });

  it('leaves out inactive and hidden projects', () => {
    const entries = tickerEntries([
      plant('plant-1', { active: false }),
      plant('plant-2', { hiddenAt: '2026-11-01T00:00:00Z' }),
      plant('plant-3', { active: null, size: 50 }),
    ]);
    expect(entries.map(({ ids, size }) => ({ ids, size }))).toEqual([
      { ids: ['plant-3'], size: '$50' },
    ]);
  });

  it('puts every shown project in exactly one entry', () => {
    const projects = [
      plant('plant-1'),
      plant('plant-2', { projectId: ' P-100 ', projectType: null }),
      plant('plant-3', { projectId: 'P-200', technologies: null }),
      plant('website-1', { projectId: null, projectType: null }),
      plant('website-2', { projectId: ' ', technologies: [] }),
      plant('plant-4', { projectId: 'P-200', hiddenAt: '2026-11-01' }),
      plant('plant-5', { projectId: 'P-300', active: false }),
    ];
    const entries = tickerEntries(projects);

    expect(entries.map(({ key, ids }) => ({ key, ids }))).toEqual([
      { key: 'project:P-100', ids: ['plant-1', 'plant-2'] },
      { key: 'project:P-200', ids: ['plant-3'] },
      { key: 'document:website-1', ids: ['website-1'] },
      { key: 'document:website-2', ids: ['website-2'] },
    ]);
    const placed = entries.flatMap(({ ids }) => ids);
    expect(new Set(placed).size).toBe(placed.length);
  });

  // BlueIQ's daily file has no Project ID, so a plant added after the starter load lacks one.
  it("puts a plant without a Project ID in its Project Name's entry, but never a website project", () => {
    const entries = tickerEntries([
      plant('plant-1', {
        plantId: '1161',
        projectId: null,
        projectName: 'Michigan DNR - 30',
      }),
      plant('plant-2', {
        plantId: '1162',
        projectId: ' ',
        projectName: ' michigan  DNR - 30 ',
      }),
      plant('plant-3', {
        plantId: '1163',
        projectId: 'J-30',
        projectName: 'Michigan DNR - 30',
      }),
      plant('website-1', { projectId: null, projectName: 'Michigan DNR - 30' }),
      plant('plant-4', { plantId: '1164', projectId: null, projectName: null }),
    ]);

    expect(entries.map(({ key, ids }) => ({ key, ids }))).toEqual([
      { key: 'project:J-30', ids: ['plant-1', 'plant-2', 'plant-3'] },
      { key: 'document:website-1', ids: ['website-1'] },
      { key: 'document:plant-4', ids: ['plant-4'] },
    ]);
  });

  it('groups plants without a Project ID by name alone', () => {
    const entries = tickerEntries([
      plant('plant-1', {
        plantId: '1171',
        projectId: null,
        projectName: 'Orchard',
      }),
      plant('plant-2', {
        plantId: '1172',
        projectId: null,
        projectName: 'orchard',
      }),
      // A hidden plant's Project ID doesn't count.
      plant('plant-3', {
        plantId: '1173',
        projectId: 'J-40',
        projectName: 'Orchard',
        hiddenAt: '2026-11-01',
      }),
    ]);

    expect(entries.map(({ key, ids }) => ({ key, ids }))).toEqual([
      { key: 'name:orchard', ids: ['plant-1', 'plant-2'] },
    ]);
  });

  // Two projects can share a name, and the plant could belong to either one.
  it('keeps a plant out of both entries when two Project IDs share its name', () => {
    const entries = tickerEntries([
      plant('plant-1', {
        plantId: '1181',
        projectId: 'J-1',
        projectName: 'Main St',
      }),
      plant('plant-2', {
        plantId: '1182',
        projectId: 'J-2',
        projectName: 'Main St',
      }),
      plant('plant-3', {
        plantId: '1183',
        projectId: null,
        projectName: 'Main St',
      }),
    ]);

    expect(entries.map(({ key, ids }) => ({ key, ids }))).toEqual([
      { key: 'project:J-1', ids: ['plant-1'] },
      { key: 'project:J-2', ids: ['plant-2'] },
      { key: 'name:main st', ids: ['plant-3'] },
    ]);
  });

  it('keeps a Project ID apart from a document ID with the same text', () => {
    const entries = tickerEntries([
      plant('P-100', { projectId: null }),
      plant('plant-1', { projectId: 'P-100' }),
    ]);
    expect(entries.map(({ ids }) => ids)).toEqual([['P-100'], ['plant-1']]);
  });
});
