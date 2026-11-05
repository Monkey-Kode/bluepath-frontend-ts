// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Casestudies } from '@/sanity.types';

import {
  BACKUP_PART_TYPE,
  BACKUP_TYPE,
  type BackupSource,
  loadBackup,
  pruneBackups,
  saveBackup,
} from './backups';
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
