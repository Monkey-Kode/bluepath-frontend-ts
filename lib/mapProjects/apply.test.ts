// @vitest-environment node
import type { Mutation } from '@sanity/client';
import { describe, expect, it, vi } from 'vitest';

import {
  applyImport,
  applyStarterLoad,
  ChangeFailure,
  type ImportRequest,
  previewImport,
  previewStarterLoad,
  runChange,
  type StarterLoadRequest,
} from './apply';
import { BACKUP_TYPE, FEED_PERSON, loadBackup, saveBackup } from './backups';
import { LOCK_ID, takeLock } from './lock';
import type { MapProjectsClient } from './store';
import {
  type FakeDocument,
  type FakeSanity,
  fakeSanity,
} from './testing/fakeSanity';
import { type Cells, csv, starterCsv } from './testing/files';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

/** A plant project that an earlier file created. */
const LINCOLN: FakeDocument = {
  _id: 'plant-P-1',
  _type: 'casestudies',
  plantId: 'P-1',
  plantName: 'Lincoln Solar',
  projectName: 'Lincoln Schools',
  projectType: 'Solar',
  projectStatus: 'Operating',
  active: true,
  location: { _type: 'geopoint', lat: 40.8, lng: -96.7 },
  city: 'Lincoln',
  state: 'Nebraska',
  entity: ['Municipal'],
  size: 1200000,
};

/** Lincoln's row renames the project and adds a size. The fields it doesn't send stay. */
const LINCOLN_ROW: Cells = {
  plantId: 'P-1',
  projectName: 'Lincoln Schools District',
  projectType: 'Solar',
  latitude: '40.8',
  longitude: '-96.7',
  sizeMw: '0.8',
};

/** A website project that the starter load merged with plant P-2. */
const NEWTON: FakeDocument = {
  _id: '0b5e-newton',
  _type: 'casestudies',
  websiteId: '0b5e-newton',
  plantId: 'P-2',
  plantName: 'Wells Solar',
  projectType: 'Solar + BESS',
  location: { _type: 'geopoint', lat: 42.33, lng: -71.2 },
  address: '111 Wells Ave',
  city: 'Newton',
  state: 'Massachusetts',
  entity: ['Commercial'],
};

/** Newton's row uses BlueIQ's new type name. A listed plant counts as active. */
const NEWTON_ROW: Cells = {
  plantId: 'P-2',
  projectName: '111 Wells',
  projectType: 'Solar + Battery',
  latitude: '42.33',
  longitude: '-71.2',
};

/** The starter workbook's row for Newton, with the Sept 29 columns. */
const NEWTON_STARTER_ROW: Cells = {
  plantId: 'P-2',
  plantName: 'Wells Solar',
  projectType: 'Solar + BESS',
  projectStatus: 'Operating',
  latitude: '42.33',
  longitude: '-71.2',
  address: '9 Plant Rd',
  city: 'Waltham',
  state: 'MA',
};

/** A plant that left an earlier file. Its website field stays while it is hidden. */
const OMAHA: FakeDocument = {
  _id: 'plant-P-3',
  _type: 'casestudies',
  plantId: 'P-3',
  plantName: 'Omaha Storage',
  projectName: 'Omaha Storage',
  projectType: 'BESS',
  active: true,
  location: { _type: 'geopoint', lat: 41.25, lng: -96 },
  entity: ['Utility'],
  hiddenAt: '2026-10-01T00:00:00.000Z',
};

const OMAHA_ROW: Cells = {
  plantId: 'P-3',
  projectName: 'Omaha Storage',
  projectType: 'BESS',
  latitude: '41.25',
  longitude: '-96',
};

/** A shown plant that the file lacks, so it hides. */
const KEARNEY: FakeDocument = {
  _id: 'plant-P-4',
  _type: 'casestudies',
  plantId: 'P-4',
  plantName: 'Kearney Wind',
  projectType: 'Wind',
  entity: ['Utility'],
};

/** A website-only project. It has no Plant ID, so no file touches it. */
const LIBRARY: FakeDocument = {
  _id: '7c1d-library',
  _type: 'casestudies',
  websiteId: '7c1d-library',
  title: 'Old Library',
  projectName: 'Old Library',
};

/** A new plant. Its Financing Amount holds the sample file's placeholder text. */
const HASTINGS_ROW: Cells = {
  plantId: 'P-5',
  projectName: 'Hastings Solar',
  projectType: 'Solar',
  latitude: '40.58',
  longitude: '-98.39',
  sizeMw: '2.5',
  financingAmount: 'needs to be decided with BluePath',
};

/** The starter workbook's row for Hastings. Active is No, which a write must keep as false. */
const HASTINGS_STARTER_ROW: Cells = {
  plantId: 'P-5',
  plantName: 'Hastings Solar',
  projectType: 'Solar',
  active: 'No',
  latitude: '40.58',
  longitude: '-98.39',
  state: 'NE',
  size: '2,500',
  technologies: 'Solar PV; Battery Storage',
};

const PROJECTS = [LINCOLN, NEWTON, OMAHA, KEARNEY, LIBRARY];
const FILE = csv(LINCOLN_ROW, NEWTON_ROW, OMAHA_ROW, HASTINGS_ROW);

function feed(file = FILE, fields: Partial<ImportRequest> = {}): ImportRequest {
  return {
    file,
    options: { hideMissing: true },
    source: { kind: 'feed' },
    person: FEED_PERSON,
    now: NOW,
    ...fields,
  };
}

const ofType = (sanity: FakeSanity, type: string) =>
  sanity.documents().filter(({ _type }) => _type === type);

const projects = (sanity: FakeSanity) => ofType(sanity, 'casestudies');

const withoutRev = (docs: FakeDocument[]) =>
  docs.map(({ _rev, ...doc }) => doc);

const writesProjects = (mutations: Mutation[]) =>
  mutations.some((mutation) =>
    'create' in mutation
      ? mutation.create._type === 'casestudies'
      : 'patch' in mutation &&
        'id' in mutation.patch &&
        mutation.patch.id !== LOCK_ID,
  );

const savesBackupHeader = (mutations: Mutation[]) =>
  mutations.some(
    (mutation) => 'create' in mutation && mutation.create._type === BACKUP_TYPE,
  );

/** Runs `before` once, just ahead of the first transaction that `matches`. */
function interrupt(
  sanity: FakeSanity,
  matches: (mutations: Mutation[]) => boolean,
  before: () => Promise<unknown>,
): MapProjectsClient {
  let done = false;
  return {
    fetch: sanity.fetch,
    async mutate(mutations, options) {
      if (!done && matches(mutations)) {
        done = true;
        await before();
      }
      return sanity.mutate(mutations, options);
    },
  };
}

describe('applyImport', () => {
  it('writes each project as the plan says and publishes it (AC-4.4, AC-4.5)', async () => {
    const sanity = fakeSanity(PROJECTS);

    const result = await applyImport(sanity, feed());

    expect(result).toMatchObject({
      status: 'applied',
      plan: {
        counts: {
          created: 1,
          updated: 3,
          unchanged: 0,
          skipped: 0,
          hidden: 1,
          returned: 1,
        },
      },
      problems: [],
    });
    expect(withoutRev(projects(sanity))).toEqual(
      withoutRev([
        {
          ...NEWTON,
          projectName: '111 Wells',
          projectType: 'Solar + Battery',
          active: true,
        },
        LIBRARY,
        { ...LINCOLN, projectName: 'Lincoln Schools District', sizeMw: 0.8 },
        (({ hiddenAt: _returned, ...omaha }) => omaha)(OMAHA),
        { ...KEARNEY, hiddenAt: NOW.toISOString() },
        {
          _id: 'plant-P-5',
          _type: 'casestudies',
          plantId: 'P-5',
          projectName: 'Hastings Solar',
          projectType: 'Solar',
          active: true,
          location: { _type: 'geopoint', lat: 40.58, lng: -98.39 },
          sizeMw: 2.5,
        },
      ]),
    );
    expect(sanity.get('7c1d-library')?._rev).toBe('rev-0');
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it('saves a backup of every project before it writes (AC-7.1)', async () => {
    const sanity = fakeSanity(PROJECTS);
    const before = projects(sanity);

    const result = await applyImport(sanity, feed());

    if (result.status !== 'applied' || !result.backupId) {
      throw new Error(`No backup: ${result.status}`);
    }
    const saved = await loadBackup(sanity, result.backupId);
    expect(saved?.backup).toMatchObject({
      createdAt: NOW.toISOString(),
      source: { kind: 'feed' },
      person: 'BlueIQ feed',
      count: 5,
    });
    expect(saved?.projects).toEqual(before);
    const order = sanity.transactions.map(({ mutations }) =>
      savesBackupHeader(mutations)
        ? 'backup'
        : writesProjects(mutations)
          ? 'write'
          : 'other',
    );
    expect(order.indexOf('backup')).toBeGreaterThan(-1);
    expect(order.indexOf('backup')).toBeLessThan(order.indexOf('write'));
  });

  it('writes nothing when the backup fails (AC-7.1)', async () => {
    const sanity = fakeSanity(PROJECTS);
    const before = projects(sanity);
    sanity.failWhen(savesBackupHeader);

    const error = await applyImport(sanity, feed()).catch((caught) => caught);

    expect(error).toBeInstanceOf(ChangeFailure);
    expect(error).toMatchObject({
      stage: 'backup',
      cause: { statusCode: 500 },
    });
    expect(projects(sanity)).toEqual(before);
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it('changes nothing and saves no backup for the same file again (AC-4.6)', async () => {
    const sanity = fakeSanity(PROJECTS);
    await applyImport(sanity, feed());
    const before = projects(sanity);
    const backups = ofType(sanity, BACKUP_TYPE);

    const again = await applyImport(
      sanity,
      feed(FILE, { now: new Date(NOW.getTime() + DAY) }),
    );

    expect(again).toMatchObject({
      status: 'applied',
      backupId: null,
      plan: {
        writes: false,
        counts: { created: 0, updated: 0, unchanged: 4, hidden: 0 },
      },
    });
    expect(projects(sanity)).toEqual(before);
    expect(ofType(sanity, BACKUP_TYPE)).toEqual(backups);
  });

  it('finishes the job when it runs again after a partial write (AC-4.11)', async () => {
    const limits = { maxMutations: 1, maxBytes: 1_000_000 };
    // The rerun comes later, so its backup gets its own ID and its hide its own time.
    const later = new Date(NOW.getTime() + 60_000);
    const clean = fakeSanity(PROJECTS);
    await applyImport(clean, feed(FILE, { limits, now: later }));
    const sanity = fakeSanity(PROJECTS);
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._id === 'plant-P-5',
      ),
    );

    const error = await applyImport(sanity, feed(FILE, { limits })).catch(
      (caught) => caught,
    );
    expect(error).toMatchObject({ stage: 'write' });
    expect(sanity.get('plant-P-1')?.projectName).toBe(
      'Lincoln Schools District',
    );
    expect(sanity.get('plant-P-5')).toBeUndefined();
    expect(sanity.get(LOCK_ID)).toBeUndefined();

    const rerun = await applyImport(sanity, feed(FILE, { limits, now: later }));

    expect(rerun).toMatchObject({
      status: 'applied',
      plan: { counts: { created: 1, updated: 0, hidden: 1 } },
    });
    expect(withoutRev(projects(sanity))).toEqual(withoutRev(projects(clean)));
  });

  it('writes in a few large transactions (NFR-005)', async () => {
    const rows = Array.from({ length: 500 }, (_, n) => ({
      plantId: `N-${n}`,
      projectName: `Plant ${n}`,
    }));
    const sanity = fakeSanity(PROJECTS);

    await applyImport(
      sanity,
      feed(csv(...rows), { options: { hideMissing: false } }),
    );

    const writes = sanity.transactions.filter(({ mutations }) =>
      writesProjects(mutations),
    );
    expect(writes).toHaveLength(2);
    expect(projects(sanity)).toHaveLength(505);
  });

  it('never overwrites a project that changed after the read', async () => {
    const sanity = fakeSanity(PROJECTS);
    const client = interrupt(sanity, savesBackupHeader, () =>
      sanity.mutate([
        { patch: { id: 'plant-P-1', set: { plantName: 'Edited' } } },
      ]),
    );

    await expect(applyImport(client, feed())).rejects.toMatchObject({
      stage: 'write',
      cause: { statusCode: 409 },
    });
    expect(sanity.get('plant-P-1')?.plantName).toBe('Edited');
    expect(sanity.get('plant-P-5')).toBeUndefined();
  });

  it('replies busy while another change holds the lock, and writes nothing (AC-4.11)', async () => {
    const sanity = fakeSanity(PROJECTS);
    const other = await takeLock(sanity, new Date(NOW.getTime() - 60_000));
    const before = projects(sanity);

    expect(await applyImport(sanity, feed())).toEqual({ status: 'busy' });
    expect(projects(sanity)).toEqual(before);
    expect(sanity.get(LOCK_ID)?._rev).toBe(other);
  });

  it('takes over a lock that a crashed run left two minutes ago (AC-4.11)', async () => {
    const sanity = fakeSanity(PROJECTS);
    await takeLock(sanity, new Date(NOW.getTime() - 2 * 60_000 - 1));

    expect(await applyImport(sanity, feed())).toMatchObject({
      status: 'applied',
    });
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it('replies not-ready before the starter load, and takes no lock (AC-4.12)', async () => {
    const sanity = fakeSanity([LIBRARY]);
    await takeLock(sanity, NOW);
    const transactions = sanity.transactions.length;

    expect(await applyImport(sanity, feed(new Uint8Array()))).toEqual({
      status: 'not-ready',
    });
    expect(sanity.transactions).toHaveLength(transactions);
  });

  it('rejects an unreadable file before the lock (AC-4.9)', async () => {
    const sanity = fakeSanity(PROJECTS);
    await takeLock(sanity, NOW);

    expect(
      await applyImport(
        sanity,
        feed(new TextEncoder().encode('Plant ID,Plant Name\r\nP-1,Lincoln')),
      ),
    ).toMatchObject({
      status: 'unreadable',
      error: { reason: 'missing-columns' },
      message: expect.any(String),
    });
  });

  it('rejects a file that breaks the half rule before the lock (AC-4.10)', async () => {
    const sanity = fakeSanity(PROJECTS);
    await takeLock(sanity, NOW);
    const before = projects(sanity);

    const result = await applyImport(sanity, feed(csv(HASTINGS_ROW)));

    expect(result).toMatchObject({
      status: 'rejected',
      plan: { rejection: { reason: 'half-rule' } },
    });
    expect(projects(sanity)).toEqual(before);
  });

  it("applies exactly what a manual import's preview showed (AC-4.4)", async () => {
    const sanity = fakeSanity(PROJECTS);
    const options = { hideMissing: false };

    const preview = await previewImport(sanity, { file: FILE, options });
    if (preview.status !== 'ready') throw new Error(preview.status);
    expect(sanity.transactions).toEqual([]);

    const result = await applyImport(sanity, {
      ...feed(FILE, { options }),
      source: { kind: 'file', name: 'plants.csv' },
      person: 'Sadie',
      token: preview.plan.token,
    });

    expect(result).toMatchObject({
      status: 'applied',
      plan: { counts: preview.plan.counts, token: preview.plan.token },
    });
    expect(sanity.get('plant-P-4')?.hiddenAt).toBeUndefined();
  });

  it('writes nothing and shows a new preview when projects changed after the preview (AC-4.4)', async () => {
    const sanity = fakeSanity(PROJECTS);
    const options = { hideMissing: true };
    const preview = await previewImport(sanity, { file: FILE, options });
    if (preview.status !== 'ready') throw new Error(preview.status);
    await sanity.mutate([
      { patch: { id: 'plant-P-4', set: { plantName: 'Kearney Wind II' } } },
    ]);
    const before = projects(sanity);

    const result = await applyImport(sanity, {
      ...feed(FILE, { options }),
      source: { kind: 'file', name: 'plants.csv' },
      token: preview.plan.token,
    });

    expect(result.status).toBe('stale');
    if (result.status !== 'stale') return;
    expect(result.plan.token).not.toBe(preview.plan.token);
    expect(projects(sanity)).toEqual(before);
    expect(ofType(sanity, BACKUP_TYPE)).toEqual([]);
  });

  it('writes nothing when projects change between the check and the lock (AC-4.4)', async () => {
    const sanity = fakeSanity(PROJECTS);
    const options = { hideMissing: true };
    const preview = await previewImport(sanity, { file: FILE, options });
    if (preview.status !== 'ready') throw new Error(preview.status);
    const client = interrupt(
      sanity,
      (mutations) =>
        mutations.some(
          (mutation) => 'create' in mutation && mutation.create._id === LOCK_ID,
        ),
      () =>
        sanity.mutate([
          { patch: { id: 'plant-P-4', set: { plantName: 'Kearney Wind II' } } },
        ]),
    );

    const result = await applyImport(client, {
      ...feed(FILE, { options }),
      source: { kind: 'file', name: 'plants.csv' },
      token: preview.plan.token,
    });

    expect(result.status).toBe('stale');
    expect(sanity.get('plant-P-5')).toBeUndefined();
    expect(ofType(sanity, BACKUP_TYPE)).toEqual([]);
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it("deletes the feed's expired backups on each feed file, even one that changes nothing (AC-7.4)", async () => {
    const sanity = fakeSanity(PROJECTS);
    await applyImport(sanity, feed());
    const expired = await saveBackup(sanity, {
      projects: [],
      source: { kind: 'feed' },
      person: FEED_PERSON,
      now: new Date(NOW.getTime() - 91 * DAY),
    });

    await applyImport(sanity, {
      ...feed(),
      source: { kind: 'file', name: 'plants.csv' },
      person: 'Sadie',
    });
    expect(await loadBackup(sanity, expired)).not.toBeNull();

    const result = await applyImport(sanity, feed());
    expect(result).toMatchObject({ status: 'applied', backupId: null });
    expect(await loadBackup(sanity, expired)).toBeNull();
  });

  it('still applies the file when the prune or the release fails', async () => {
    const sanity = fakeSanity(PROJECTS);
    await saveBackup(sanity, {
      projects: [],
      source: { kind: 'feed' },
      person: FEED_PERSON,
      now: new Date(NOW.getTime() - 91 * DAY),
    });
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'delete' in mutation &&
          !('id' in mutation.delete && mutation.delete.id === LOCK_ID),
      ),
    );
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'delete' in mutation &&
          'id' in mutation.delete &&
          mutation.delete.id === LOCK_ID,
      ),
    );

    const result = await applyImport(sanity, feed());

    expect(result).toMatchObject({
      status: 'applied',
      problems: [
        { stage: 'prune', message: expect.any(String) },
        { stage: 'unlock', message: expect.any(String) },
      ],
    });
    expect(sanity.get('plant-P-5')).toBeDefined();
  });
});

describe('runChange', () => {
  const context = {
    source: { kind: 'delete' },
    person: 'Sadie',
    now: NOW,
  } as const;

  it('serves every kind of change with the same lock (AC-4.11)', async () => {
    const sanity = fakeSanity(PROJECTS);
    await takeLock(sanity, NOW);
    const decide = vi.fn();

    expect(await runChange(sanity, context, decide)).toEqual({
      status: 'busy',
    });
    expect(decide).not.toHaveBeenCalled();
  });

  it('saves a backup that names the change, then writes (AC-7.1)', async () => {
    const sanity = fakeSanity(PROJECTS);

    const result = await runChange(sanity, context, (current) => ({
      mutations: [{ delete: { id: 'plant-P-4' } }],
      value: current.length,
    }));

    expect(result).toMatchObject({ status: 'done', value: 5 });
    if (result.status !== 'done' || !result.backupId)
      throw new Error('No backup.');
    expect((await loadBackup(sanity, result.backupId))?.backup).toMatchObject({
      source: { kind: 'delete' },
      person: 'Sadie',
      count: 5,
    });
    expect(sanity.get('plant-P-4')).toBeUndefined();
  });

  it('releases the lock when the change fails', async () => {
    const sanity = fakeSanity(PROJECTS);

    await expect(
      runChange(sanity, context, () => {
        throw new Error('No such project.');
      }),
    ).rejects.toThrow('No such project.');
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });
});

describe('starter load (AC-8.7)', () => {
  /** Website projects before the load. None has a Plant ID or a Website ID yet. */
  const WELLS: FakeDocument = {
    _id: '0b5e-newton',
    _type: 'casestudies',
    title: '111 Wells',
    projectName: '111 Wells',
    location: { _type: 'geopoint', lat: 42.3, lng: -71.2 },
    address: '111 Wells Ave',
    city: 'Newton',
    state: 'MA',
    entity: ['Commercial'],
    financing: ['PPA'],
  };
  const OLD_LIBRARY: FakeDocument = {
    _id: '7c1d-library',
    _type: 'casestudies',
    title: 'Old Library',
    projectName: 'Old Library',
  };
  const GONE: FakeDocument = {
    _id: '9f2a-gone',
    _type: 'casestudies',
    title: 'Gone Project',
  };
  const WEBSITE = [WELLS, OLD_LIBRARY, GONE];

  /** Merges Wells with plant P-2, keeps the library, and adds plant P-5. */
  const WORKBOOK = starterCsv(
    {
      ...NEWTON_STARTER_ROW,
      websiteId: '0b5e-newton',
      projectName: '111 Wells',
      address: '111 Wells Ave',
      city: 'Newton',
      entity: 'Commercial',
    },
    {
      websiteId: '7c1d-library',
      projectName: 'Old Library',
      technologies: 'LED Lighting',
    },
    HASTINGS_STARTER_ROW,
  );

  const load = (
    token: string,
    fields: Partial<StarterLoadRequest> = {},
  ): StarterLoadRequest => ({
    file: WORKBOOK,
    token,
    source: { kind: 'file', name: 'starter.csv' },
    person: 'Sadie',
    now: NOW,
    ...fields,
  });

  async function previewToken(client: MapProjectsClient, file = WORKBOOK) {
    const preview = await previewStarterLoad(client, { file });
    if (preview.status !== 'ready') throw new Error(preview.status);
    return preview.plan.token;
  }

  it('previews the load without writing', async () => {
    const sanity = fakeSanity(WEBSITE);

    expect(await previewStarterLoad(sanity, { file: WORKBOOK })).toMatchObject({
      status: 'ready',
      plan: {
        counts: { created: 1, updated: 2, skipped: 0, hidden: 1 },
        hides: [{ id: '9f2a-gone', plantId: null, name: 'Gone Project' }],
      },
    });
    expect(sanity.transactions).toEqual([]);
  });

  it('saves a backup, then writes every column of each row', async () => {
    const sanity = fakeSanity(WEBSITE);
    const before = projects(sanity);

    const result = await applyStarterLoad(
      sanity,
      load(await previewToken(sanity)),
    );

    if (result.status !== 'applied' || !result.backupId) {
      throw new Error(`No backup: ${result.status}`);
    }
    const saved = await loadBackup(sanity, result.backupId);
    expect(saved?.backup).toMatchObject({
      source: { kind: 'file', name: 'starter.csv' },
      person: 'Sadie',
      count: 3,
    });
    expect(saved?.projects).toEqual(before);

    const { financing: _cleared, ...wells } = WELLS;
    expect(withoutRev(projects(sanity))).toEqual(
      withoutRev([
        {
          ...wells,
          websiteId: '0b5e-newton',
          plantId: 'P-2',
          plantName: 'Wells Solar',
          projectType: 'Solar + BESS',
          projectStatus: 'Operating',
          location: { _type: 'geopoint', lat: 42.33, lng: -71.2 },
        },
        {
          ...OLD_LIBRARY,
          websiteId: '7c1d-library',
          technologies: ['LED Lighting'],
        },
        { ...GONE, hiddenAt: NOW.toISOString() },
        {
          _id: 'plant-P-5',
          _type: 'casestudies',
          plantId: 'P-5',
          plantName: 'Hastings Solar',
          projectType: 'Solar',
          active: false,
          location: { _type: 'geopoint', lat: 40.58, lng: -98.39 },
          state: 'Nebraska',
          size: 2500,
          technologies: ['Solar PV', 'Battery Storage'],
        },
      ]),
    );
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it('opens imports and stops offering the load once it ran (AC-4.12)', async () => {
    const sanity = fakeSanity(WEBSITE);
    const importFile = {
      file: csv(NEWTON_ROW),
      options: { hideMissing: false },
    };
    expect(await previewImport(sanity, importFile)).toEqual({
      status: 'not-ready',
    });
    const token = await previewToken(sanity);

    await applyStarterLoad(sanity, load(token));
    const transactions = sanity.transactions.length;

    expect(await previewImport(sanity, importFile)).toMatchObject({
      status: 'ready',
    });
    expect(await previewStarterLoad(sanity, { file: WORKBOOK })).toEqual({
      status: 'loaded',
    });
    expect(await applyStarterLoad(sanity, load(token))).toEqual({
      status: 'loaded',
    });
    expect(sanity.transactions).toHaveLength(transactions);
  });

  it('replies loaded without a lock while any project has a Plant ID', async () => {
    const sanity = fakeSanity([...WEBSITE, KEARNEY]);
    await takeLock(sanity, NOW);
    const transactions = sanity.transactions.length;

    expect(await applyStarterLoad(sanity, load('any'))).toEqual({
      status: 'loaded',
    });
    expect(sanity.transactions).toHaveLength(transactions);
  });

  it('rejects a file without the Website ID column before the lock', async () => {
    const sanity = fakeSanity(WEBSITE);
    await takeLock(sanity, NOW);

    expect(
      await applyStarterLoad(sanity, load('any', { file: FILE })),
    ).toMatchObject({
      status: 'unreadable',
      error: {
        reason: 'missing-columns',
        headers: expect.arrayContaining(['Plant Name', 'Website ID']),
      },
    });
  });

  it('writes nothing and shows a new preview when projects changed after the preview', async () => {
    const sanity = fakeSanity(WEBSITE);
    const token = await previewToken(sanity);
    await sanity.mutate([
      { patch: { id: '9f2a-gone', set: { title: 'Gone, Renamed' } } },
    ]);
    const before = projects(sanity);

    const result = await applyStarterLoad(sanity, load(token));

    expect(result).toMatchObject({ status: 'stale' });
    expect(projects(sanity)).toEqual(before);
    expect(ofType(sanity, BACKUP_TYPE)).toEqual([]);
  });

  it('says how to recover when a write fails partway', async () => {
    const sanity = fakeSanity(WEBSITE);
    const token = await previewToken(sanity);
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._id === 'plant-P-5',
      ),
    );

    const error = await applyStarterLoad(
      sanity,
      load(token, { limits: { maxMutations: 1, maxBytes: 1_000_000 } }),
    ).catch((caught) => caught);

    expect(error).toBeInstanceOf(ChangeFailure);
    expect(error).toMatchObject({
      stage: 'write',
      message:
        'A write failed partway, so the load is incomplete. Restore the backup that the load saved, then run the load again.',
      cause: { statusCode: 500 },
    });
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });
});
