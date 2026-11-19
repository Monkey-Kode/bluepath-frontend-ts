// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Casestudies } from '@/sanity.types';

import {
  BACKUP_PART_TYPE,
  BACKUP_TYPE,
  type BackupSource,
  backupRows,
  deleteBackup,
  listBackups,
  loadBackup,
  pruneBackups,
  saveBackup,
} from './backups';
import { COLUMN_KEYS } from './columns';
import { fakeSanity } from './testing/fakeSanity';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number, ms = 0) =>
  new Date(NOW.getTime() - days * DAY - ms);

function project(n: number, fields: Partial<Casestudies> = {}): Casestudies {
  return {
    _id: `plant-P-${n}`,
    _type: 'casestudies',
    _rev: `rev-${n}`,
    _createdAt: '2026-09-29T00:00:00Z',
    _updatedAt: '2026-11-01T00:00:00Z',
    plantId: `P-${n}`,
    plantName: `Plant ${n}`,
    location: { _type: 'geopoint', lat: 40 + n / 100, lng: -96 },
    ...fields,
  };
}

const PROJECTS = [project(1), project(2, { hiddenAt: '2026-11-01T00:00:00Z' })];

const ofType = (sanity: ReturnType<typeof fakeSanity>, type: string) =>
  sanity.documents().filter(({ _type }) => _type === type);

function save(
  sanity: ReturnType<typeof fakeSanity>,
  source: BackupSource,
  now: Date,
  projects: readonly Casestudies[] = PROJECTS,
) {
  return saveBackup(sanity, { projects, source, person: 'Sadie', now });
}

describe('saveBackup', () => {
  it('records the time, source, person, and count with every project (AC-7.1)', async () => {
    const sanity = fakeSanity();

    const id = await saveBackup(sanity, {
      projects: PROJECTS,
      source: {
        kind: 'sheet',
        url: 'https://docs.google.com/spreadsheets/d/x',
      },
      person: 'Sadie',
      now: NOW,
    });

    expect(id).toBe('mapProjects.backup.20261104T120000000Z');
    const loaded = await loadBackup(sanity, id);
    expect(loaded?.backup).toEqual({
      _id: id,
      createdAt: NOW.toISOString(),
      source: {
        kind: 'sheet',
        url: 'https://docs.google.com/spreadsheets/d/x',
      },
      person: 'Sadie',
      count: 2,
      parts: 1,
    });
    expect(loaded?.projects).toEqual(PROJECTS);
  });

  it('keeps every document ID private, so public reads never see a backup', async () => {
    const sanity = fakeSanity();

    await save(sanity, { kind: 'feed' }, NOW);

    for (const { _id } of sanity.documents()) {
      expect(_id).toMatch(/^mapProjects\.backup\./);
    }
  });

  it('splits a large backup into parts, each in its own transaction', async () => {
    const sanity = fakeSanity();
    const projects = Array.from({ length: 40 }, (_, n) =>
      project(n, { content: `Project ${n} `.repeat(20 + n) }),
    );

    const id = await saveBackup(
      sanity,
      { projects, source: { kind: 'feed' }, person: 'BlueIQ feed', now: NOW },
      { partChars: 500 },
    );

    const parts = ofType(sanity, BACKUP_PART_TYPE);
    expect(parts.length).toBeGreaterThan(1);
    expect(sanity.transactions).toHaveLength(parts.length);
    for (const { mutations } of sanity.transactions) {
      const sizes = mutations.flatMap((mutation) =>
        'create' in mutation && mutation.create._type === BACKUP_PART_TYPE
          ? [String(mutation.create.data).length]
          : [],
      );
      expect(sizes).toHaveLength(1);
      expect(sizes[0]).toBeLessThanOrEqual(500);
    }
    const loaded = await loadBackup(sanity, id);
    expect(loaded?.backup.parts).toBe(parts.length);
    expect(loaded?.projects).toEqual(projects);
  });

  it('lists no backup when a part fails to save', async () => {
    const sanity = fakeSanity();
    const projects = Array.from({ length: 40 }, (_, n) =>
      project(n, { content: `Project ${n} `.repeat(20) }),
    );
    let calls = 0;
    sanity.failWhen(() => {
      calls += 1;
      return calls === 2;
    });

    await expect(
      saveBackup(
        sanity,
        { projects, source: { kind: 'feed' }, person: 'BlueIQ feed', now: NOW },
        { partChars: 500 },
      ),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(ofType(sanity, BACKUP_TYPE)).toEqual([]);
  });
});

describe('loadBackup', () => {
  it('joins the parts in index order, whatever order the dataset returns them in', async () => {
    const saved = fakeSanity();
    const projects = Array.from({ length: 40 }, (_, n) =>
      project(n, { content: `Project ${n} `.repeat(20 + n) }),
    );
    const id = await saveBackup(
      saved,
      { projects, source: { kind: 'feed' }, person: 'BlueIQ feed', now: NOW },
      { partChars: 500 },
    );
    const reversed = fakeSanity(saved.documents().reverse());

    expect((await loadBackup(reversed, id))?.projects).toEqual(projects);
  });

  it('returns null for a backup that does not exist', async () => {
    expect(await loadBackup(fakeSanity(), 'mapProjects.backup.x')).toBeNull();
  });

  it('refuses a backup with a missing part', async () => {
    const sanity = fakeSanity([
      {
        _id: 'mapProjects.backup.x',
        _type: BACKUP_TYPE,
        createdAt: NOW.toISOString(),
        source: { kind: 'feed' },
        person: 'BlueIQ feed',
        count: 1,
        parts: 2,
      },
      {
        _id: 'mapProjects.backup.x.0',
        _type: BACKUP_PART_TYPE,
        backup: 'mapProjects.backup.x',
        index: 0,
        data: '',
      },
    ]);

    await expect(loadBackup(sanity, 'mapProjects.backup.x')).rejects.toThrow(
      'incomplete',
    );
  });
});

describe('pruneBackups', () => {
  it("deletes the feed's backups after 90 days and keeps editors' backups (AC-7.4)", async () => {
    const sanity = fakeSanity();
    const old = await save(sanity, { kind: 'feed' }, daysAgo(90, 1));
    const edge = await save(sanity, { kind: 'feed' }, daysAgo(90));
    const recent = await save(sanity, { kind: 'feed' }, daysAgo(3));
    const editors = await Promise.all(
      (
        [
          { kind: 'file', name: 'plants.xlsx' },
          { kind: 'sheet', url: 'https://docs.google.com/spreadsheets/d/x' },
          { kind: 'restore', backupId: old },
          { kind: 'link' },
          { kind: 'delete' },
        ] satisfies BackupSource[]
      ).map((source, n) => save(sanity, source, daysAgo(400 + n))),
    );

    expect(await pruneBackups(sanity, NOW)).toBe(1);

    const left = ofType(sanity, BACKUP_TYPE).map(({ _id }) => _id);
    expect(left.sort()).toEqual([edge, recent, ...editors].sort());
    expect(await loadBackup(sanity, old)).toBeNull();
    const parts = ofType(sanity, BACKUP_PART_TYPE).map(({ backup }) => backup);
    expect(parts).not.toContain(old);
    expect(parts).toHaveLength(left.length);
  });

  it('deletes parts that a failed backup left without a header', async () => {
    const sanity = fakeSanity([
      {
        _id: 'mapProjects.backup.x.0',
        _type: BACKUP_PART_TYPE,
        backup: 'mapProjects.backup.x',
        index: 0,
        data: '',
      },
    ]);
    const kept = await save(sanity, { kind: 'file', name: 'a.csv' }, NOW);

    expect(await pruneBackups(sanity, NOW)).toBe(0);

    expect(
      ofType(sanity, BACKUP_PART_TYPE).map(({ backup }) => backup),
    ).toEqual([kept]);
  });

  it('writes nothing when nothing has expired', async () => {
    const sanity = fakeSanity();
    await save(sanity, { kind: 'feed' }, daysAgo(1));
    const before = sanity.transactions.length;

    expect(await pruneBackups(sanity, NOW)).toBe(0);
    expect(sanity.transactions).toHaveLength(before);
  });
});

describe('listBackups', () => {
  it('lists each backup newest first with its time, source, person, and count (AC-7.2)', async () => {
    const sanity = fakeSanity();
    const older = await save(sanity, { kind: 'feed' }, daysAgo(2));
    const newest = await save(sanity, { kind: 'link' }, NOW);
    const middle = await save(
      sanity,
      { kind: 'file', name: 'plants.xlsx' },
      daysAgo(1),
      [project(1)],
    );

    expect(await listBackups(sanity)).toEqual([
      {
        id: newest,
        createdAt: NOW.toISOString(),
        source: { kind: 'link' },
        person: 'Sadie',
        count: 2,
      },
      {
        id: middle,
        createdAt: daysAgo(1).toISOString(),
        source: { kind: 'file', name: 'plants.xlsx' },
        person: 'Sadie',
        count: 1,
      },
      {
        id: older,
        createdAt: daysAgo(2).toISOString(),
        source: { kind: 'feed' },
        person: 'Sadie',
        count: 2,
      },
    ]);
  });

  it('lists nothing when no backup exists', async () => {
    expect(await listBackups(fakeSanity([project(1)]))).toEqual([]);
  });
});

describe('backupRows', () => {
  const row = (project: Casestudies) =>
    Object.fromEntries(
      COLUMN_KEYS.map((key, index) => [key, backupRows([project])[0][index]]),
    );

  it("gives each project the starter workbook's columns, in order (AC-7.2)", () => {
    const merged = project(7, {
      _id: '0b5e-old-mill',
      plantName: 'Old Mill Solar',
      projectId: 'PR-70',
      projectName: 'Old Mill',
      projectType: 'Solar',
      projectStatus: 'Operating',
      active: true,
      location: { _type: 'geopoint', lat: 42.6334, lng: -71.3162 },
      address: '1 Mill St',
      city: 'Lowell',
      state: 'Massachusetts',
      zip: '01852',
      county: 'Middlesex',
      entity: ['School', 'Nonprofit'],
      financing: ['PPA'],
      size: 1250000,
      technologies: ['Solar', 'Storage'],
      sizeMw: 0.5465,
      financingAmount: 1250000,
      websiteId: '0b5e-old-mill',
      title: 'The old name',
    });

    expect(backupRows([merged])).toEqual([
      [
        'P-7',
        'Old Mill Solar',
        'PR-70',
        'Old Mill',
        'Solar',
        'Operating',
        'Yes',
        42.6334,
        -71.3162,
        '1 Mill St',
        'Lowell',
        'Massachusetts',
        '01852',
        'Middlesex',
        'School; Nonprofit',
        'PPA',
        1250000,
        'Solar; Storage',
        0.5465,
        1250000,
        '0b5e-old-mill',
      ],
    ]);
  });

  it('keeps one row per project, in the backup order', () => {
    const rows = backupRows([project(2), project(1)]);

    expect(rows.map(([plantId]) => plantId)).toEqual(['P-2', 'P-1']);
    for (const cells of rows) expect(cells).toHaveLength(COLUMN_KEYS.length);
  });

  it('leaves a blank cell for each missing, empty, or blank value', () => {
    const sparse = project(3, {
      plantName: '',
      projectType: '   ',
      active: false,
      location: undefined,
      entity: [],
      financing: ['', ' '],
    });

    expect(row(sparse)).toEqual({
      ...Object.fromEntries(COLUMN_KEYS.map((key) => [key, null])),
      plantId: 'P-3',
      active: 'No',
    });
  });

  it('names a project from before the starter load as the starter workbook does (AC-8.3)', () => {
    const before = project(0, {
      _id: '7c1d-acorn',
      plantId: undefined,
      plantName: undefined,
      location: undefined,
      title: 'Acorn School',
    });

    expect(row(before)).toMatchObject({
      plantId: null,
      projectName: 'Acorn School',
      websiteId: '7c1d-acorn',
    });
  });

  it("keeps BlueIQ's blank Project Name and a plant's blank Website ID", () => {
    expect(row(project(4, { title: 'An old name' }))).toMatchObject({
      projectName: null,
      websiteId: null,
    });
  });

  it("keeps a website project's own Project Name and Website ID", () => {
    const after = project(0, {
      _id: '7c1d-acorn',
      plantId: undefined,
      projectName: 'Acorn School',
      websiteId: '7c1d-acorn',
      title: 'Acorn School (old)',
    });

    expect(row(after)).toMatchObject({
      projectName: 'Acorn School',
      websiteId: '7c1d-acorn',
    });
  });
});

describe('deleteBackup', () => {
  it("deletes an editor's backup with all its parts in one transaction (AC-7.4)", async () => {
    const sanity = fakeSanity([project(1)]);
    const projects = Array.from({ length: 40 }, (_, n) =>
      project(n, { content: `Project ${n} `.repeat(20 + n) }),
    );
    const kept = await save(sanity, { kind: 'link' }, daysAgo(1));
    const id = await saveBackup(
      sanity,
      {
        projects,
        source: { kind: 'file', name: 'plants.xlsx' },
        person: 'Sadie',
        now: NOW,
      },
      { partChars: 500 },
    );
    expect(ofType(sanity, BACKUP_PART_TYPE).length).toBeGreaterThan(2);
    const before = sanity.transactions.length;

    expect(await deleteBackup(sanity, id)).toBe('deleted');

    expect(sanity.transactions).toHaveLength(before + 1);
    expect(ofType(sanity, BACKUP_TYPE).map(({ _id }) => _id)).toEqual([kept]);
    expect(
      ofType(sanity, BACKUP_PART_TYPE).map(({ backup }) => backup),
    ).toEqual([kept]);
    expect(sanity.get('plant-P-1')).toBeDefined();
  });

  it("keeps the feed's backups, which go after 90 days (AC-7.4)", async () => {
    const sanity = fakeSanity();
    const id = await save(sanity, { kind: 'feed' }, NOW);
    const before = sanity.documents();

    expect(await deleteBackup(sanity, id)).toBe('feed');
    expect(sanity.documents()).toEqual(before);
  });

  it.each([
    ['a backup that does not exist', 'mapProjects.backup.x'],
    ['a backup part', 'PART'],
    ['a map project', 'plant-P-1'],
  ])('deletes nothing for %s', async (_name, target) => {
    const sanity = fakeSanity([project(1)]);
    const id = await save(sanity, { kind: 'link' }, NOW);
    const before = sanity.documents();

    expect(
      await deleteBackup(sanity, target === 'PART' ? `${id}.0` : target),
    ).toBe('missing');
    expect(sanity.documents()).toEqual(before);
  });
});
